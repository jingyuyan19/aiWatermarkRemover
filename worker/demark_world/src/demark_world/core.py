from pathlib import Path
from typing import Any, Callable

import numpy as np
import torch
import gc # Added for explicit memory cleanup
from loguru import logger
from tqdm import tqdm

import ffmpeg
from demark_world.schemas import CleanerType
from demark_world.utils.imputation_utils import (
    find_2d_data_bkps,
    find_idxs_interval,
    get_interval_average_bbox,
)
from demark_world.utils.video_utils import VideoLoader, merge_frames_with_overlap
from demark_world.watermark_cleaner import WaterMarkCleaner
from demark_world.watermark_detector import DeMarkWorldDetector
from demark_world.utils.imputation_utils import refine_bkps_by_chunk_size

VIDEO_EXTENSIONS = [".mp4", ".avi", ".mov", ".mkv", ".flv", ".wmv", ".webm"]

def log_memory_stats(tag=""):
    try:
        import torch
        free, total = torch.cuda.mem_get_info()
        allocated = torch.cuda.memory_allocated()
        reserved = torch.cuda.memory_reserved()
        logger.info(f"[{tag}] CUDA Memory: Free={free/1024**3:.2f}GB, Allocated={allocated/1024**3:.2f}GB, Reserved={reserved/1024**3:.2f}GB")
    except:
        pass


class DeMarkWorld:
    def __init__(self, cleaner_type: CleanerType = CleanerType.LAMA):
        # self.detector = DeMarkWorldDetector()  <-- REMOVED: Now runs in subprocess to avoid memory leaks
        self.cleaner = WaterMarkCleaner(cleaner_type)
        self.cleaner_type = cleaner_type

    def run_batch(
        self,
        input_video_dir_path: Path,
        output_video_dir_path: Path | None = None,
        progress_callback: Callable[[int], None] | None = None,
        quiet: bool = False,
    ):
        if output_video_dir_path is None:
            output_video_dir_path = input_video_dir_path.parent / "watermark_removed"
            if not quiet:
                logger.warning(
                    f"output_video_dir_path is not set, using {output_video_dir_path} as output_video_dir_path"
                )
        output_video_dir_path.mkdir(parents=True, exist_ok=True)
        input_video_paths = []
        for ext in VIDEO_EXTENSIONS:
            input_video_paths.extend(input_video_dir_path.rglob(f"*{ext}"))

        video_lengths = len(input_video_paths)
        if not quiet:
            logger.info(f"Found {video_lengths} video(s) to process")
        for idx, input_video_path in enumerate(
            tqdm(input_video_paths, desc="Processing videos", disable=quiet)
        ):
            output_video_path = output_video_dir_path / input_video_path.name
            if progress_callback:

                def batch_progress_callback(single_video_progress: int):
                    overall_progress = int(
                        (idx / video_lengths) * 100 + (single_video_progress / video_lengths)
                    )
                    progress_callback(min(overall_progress, 100))

                self.run(
                    input_video_path,
                    output_video_path,
                    progress_callback=batch_progress_callback,
                    quiet=quiet,
                )
            else:
                self.run(
                    input_video_path,
                    output_video_path,
                    progress_callback=None,
                    quiet=quiet,
                )

    def run(
        self,
        input_video_path: Path,
        output_video_path: Path,
        progress_callback: Callable[[int], None] | None = None,
        quiet: bool = False,
    ):
        input_video_loader = VideoLoader(input_video_path)
        output_video_path.parent.mkdir(parents=True, exist_ok=True)
        width = input_video_loader.width
        height = input_video_loader.height
        fps = input_video_loader.fps
        total_frames = input_video_loader.total_frames

        temp_output_path = output_video_path.parent / f"temp_{output_video_path.name}"
        output_options = {
            "pix_fmt": "yuv420p",
            "vcodec": "libx264",
            "preset": "slow",
        }

        if input_video_loader.original_bitrate:
            output_options["video_bitrate"] = str(
                int(int(input_video_loader.original_bitrate) * 1.2)
            )
        else:
            output_options["crf"] = "18"

        process_out = (
            ffmpeg.input(
                "pipe:",
                format="rawvideo",
                pix_fmt="bgr24",
                s=f"{width}x{height}",
                r=fps,
            )
            .output(str(temp_output_path), **output_options)
            .overwrite_output()
            .global_args("-loglevel", "error")
            .run_async(pipe_stdin=True)
        )

        # -------------------------------------------------------------------------
        # ISOLATED DETECTION PHASE (The "Nuclear Option" for Memory Leaks)
        # We run detection in a separate process. When it finishes, the OS guarantees
        # that ALL 19GB+ of VRAM it used is reclaimed.
        # -------------------------------------------------------------------------
        import subprocess
        import pickle
        import sys
        
        detection_output_path = output_video_path.parent / f"detection_{output_video_path.stem}.pkl"
        detection_script = Path(__file__).parent.parent.parent / "run_detection.py"
        
        if not quiet:
            logger.info("Starting isolated detection subprocess...")
            
        try:
            cmd = [
                sys.executable,
                str(detection_script),
                "--video_path", str(input_video_path),
                "--output_path", str(detection_output_path)
            ]
            subprocess.run(cmd, check=True)
            
            # Load results
            with open(detection_output_path, 'rb') as f:
                det_results = pickle.load(f)
            
            frame_bboxes = det_results["frame_bboxes"]
            detect_missed = det_results["detect_missed"]
            bbox_centers = det_results["bbox_centers"]
            bboxes = det_results["bboxes"]
            
            # Clean up temp file
            if detection_output_path.exists():
                detection_output_path.unlink()
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Detection subprocess failed: {e}")
            raise e
        except Exception as e:
            logger.error(f"Failed to load detection results: {e}")
            raise e

        # Report progress (simulate detection progress for callback)
        if progress_callback:
            progress_callback(50)

        if not quiet:
            logger.debug(f"detect missed frames: {detect_missed}")
        
        log_memory_stats("Post-Detection Cleanup")

        bkps_full = [0, total_frames]
        # ... (rest of logic) ...
            
        # Process isolation handles memory cleanup now.
        log_memory_stats("Pre-Clean Start")

        if detect_missed:
            # 1. find the bkps of the bbox centers
            bkps = find_2d_data_bkps(bbox_centers)
            # add the start and end position, to form the complete interval boundaries
            bkps_full = [0] + bkps + [total_frames]
            # bkps_full = bkps_full[0] + bkps + bkps_full[1]
            # logger.debug(f"bkps intervals: {bkps_full}")

            # 2. calculate the average bbox of each interval
            interval_bboxes = get_interval_average_bbox(bboxes, bkps_full)
            # logger.debug(f"interval average bboxes: {interval_bboxes}")

            # 3. find the interval index of each missed frame
            missed_intervals = find_idxs_interval(detect_missed, bkps_full)
            # logger.debug(
            #     f"missed frame intervals: {list(zip(detect_missed, missed_intervals))}"
            # )

            # 4. fill the missed frames with the average bbox of the corresponding interval
            for missed_idx, interval_idx in zip(detect_missed, missed_intervals):
                if (
                    interval_idx < len(interval_bboxes)
                    and interval_bboxes[interval_idx] is not None
                ):
                    frame_bboxes[missed_idx]["bbox"] = interval_bboxes[interval_idx]
                    if not quiet:
                        logger.debug(
                            f"Filled missed frame {missed_idx} with bbox:\n"
                            f" {interval_bboxes[interval_idx]}"
                        )
                else:
                    # if the interval has no valid bbox, use the previous and next frame to complete (fallback strategy)
                    before = max(missed_idx - 1, 0)
                    after = min(missed_idx + 1, total_frames - 1)
                    before_box = frame_bboxes[before]["bbox"]
                    after_box = frame_bboxes[after]["bbox"]
                    if before_box:
                        frame_bboxes[missed_idx]["bbox"] = before_box
                    elif after_box:
                        frame_bboxes[missed_idx]["bbox"] = after_box
        else:
            del bboxes
            del bbox_centers
            del detect_missed
            
        # Process isolation handles memory cleanup now.
        

        if self.cleaner_type == CleanerType.LAMA:
            ## 1. Lama Cleaner Strategy.
            input_video_loader = VideoLoader(input_video_path)
            for idx, frame in enumerate(
                tqdm(
                    input_video_loader,
                    total=total_frames,
                    desc="Remove watermarks",
                    disable=quiet,
                )
            ):
                bbox = frame_bboxes[idx]["bbox"]
                if bbox is not None:
                    x1, y1, x2, y2 = bbox
                    mask = np.zeros((height, width), dtype=np.uint8)
                    mask[y1:y2, x1:x2] = 255
                    cleaned_frame = self.cleaner.clean(frame, mask)
                else:
                    cleaned_frame = frame
                process_out.stdin.write(cleaned_frame.tobytes())

                # 50% - 95%
                if progress_callback and idx % 10 == 0:
                    progress = 50 + int((idx / total_frames) * 45)
                    progress_callback(progress)
        elif self.cleaner_type == CleanerType.E2FGVI_HQ:
            ## 2. E2FGVI_HQ Cleaner Strategy with overlap blending.
            input_video_loader = VideoLoader(input_video_path)
            frame_counter = 0
            overlap_ratio: Any | int = self.cleaner.config.overlap_ratio
            all_cleaned_frames = None
            logger.debug(f"bkps_full:{bkps_full}")
            bkps_full = refine_bkps_by_chunk_size(bkps_full, self.cleaner.chunk_size)
            # [0, np.int32(25), np.int32(253), np.int32(398), np.int32(625), np.int32(853), np.int32(1004), np.int32(1231), np.int32(1459), 1602]
            # 50 frames at most
            # if len(bkps_full) == 2 and total_frames >= 100:
            #     # fallabck segmenation strategy other wise out of memory
            #     # This is a comprise...... sorry abot that...
            #     sep = 50 
            #     bkps_full: list[int] = [ i for i in range(0, total_frames, sep)]
            #     if bkps_full[-1] < total_frames:
            #         # bkps_full.append(total_frames)
            #         bkps_full[-1] = total_frames
            # Create overlapping segments for smooth transitions
            num_segments = len(bkps_full) - 1
            for segment_idx in range(num_segments):
                seg_start = bkps_full[segment_idx]
                seg_end = bkps_full[segment_idx + 1]
                seg_length = seg_end - seg_start
                # Calculate overlap size based on segment length
                segment_overlap = max(1, int(overlap_ratio * seg_length))
                # Extend segment boundaries to create overlap (except for first/last)
                start = seg_start
                end = seg_end

                # Add overlap at the start (except for first segment)
                if segment_idx > 0:
                    start = max(seg_start - segment_overlap, bkps_full[segment_idx - 1])

                # Add overlap at the end (except for last segment)
                if segment_idx < num_segments - 1:
                    end = min(seg_end + segment_overlap, bkps_full[segment_idx + 2])

                if not quiet:
                    logger.debug(
                        f"Segment {segment_idx}: original=[{seg_start}, {seg_end}), "
                        f"with_overlap=[{start}, {end}), overlap={segment_overlap}"
                    )

                frames = np.array(input_video_loader.get_slice(start, end))
                # Convert BGR to RGB for E2FGVI_HQ cleaner (expects RGB format)
                frames = frames[:, :, :, ::-1].copy()

                masks = np.zeros((len(frames), height, width), dtype=np.uint8)
                for idx in range(start, end):
                    bbox = frame_bboxes[idx]["bbox"]
                    if bbox is not None:
                        x1, y1, x2, y2 = bbox
                        # offset
                        idx_offset = idx - start
                        masks[idx_offset][y1:y2, x1:x2] = 255
                def update_clean_progress(p: float):
                    if progress_callback:
                        # Estimate current frame index being processed relative to the whole video
                        # p is 0.0-1.0 within this segment
                        current_segment_frame = int(p * (end - start))
                        current_total_frame = start + current_segment_frame
                        # Map total progress (50% to 95%) 
                        global_p = 50 + int((current_total_frame / total_frames) * 45)
                        progress_callback(min(95, global_p))

                cleaned_frames = self.cleaner.clean(frames, masks, progress_callback=update_clean_progress)

                # Merge with overlap blending support
                all_cleaned_frames = merge_frames_with_overlap(
                    result_frames=all_cleaned_frames,
                    chunk_frames=cleaned_frames,
                    start_idx=start,
                    overlap_size=segment_overlap,
                    is_first_chunk=(segment_idx == 0),
                )

                # Determine which frames to write from this segment
                # Write the core segment (seg_start to seg_end), skip overlaps for subsequent processing
                write_start = seg_start
                write_end = seg_end

                for write_idx in range(write_start, write_end):
                    if (
                        write_idx < len(all_cleaned_frames)
                        and all_cleaned_frames[write_idx] is not None
                    ):
                        cleaned_frame = all_cleaned_frames[write_idx]
                        # Convert RGB back to BGR for FFmpeg output (expects bgr24 format)
                        cleaned_frame_bgr = cleaned_frame[:, :, ::-1]
                        process_out.stdin.write(cleaned_frame_bgr.astype(np.uint8).tobytes())
                        frame_counter += 1
                        # 50% - 95%
                        if progress_callback and frame_counter % 10 == 0:
                            progress = 50 + int((frame_counter / total_frames) * 45)
                            progress_callback(progress)

        process_out.stdin.close()
        process_out.wait()
        if not quiet:
            logger.debug("Core processing loop finished. Merging audio...")

        # 95% - 99%
        if progress_callback:
            progress_callback(95)

        self.merge_audio_track(input_video_path, temp_output_path, output_video_path)

        if progress_callback:
            progress_callback(99)

    def merge_audio_track(
        self, input_video_path: Path, temp_output_path: Path, output_video_path: Path
    ):
        logger.info("Merging audio track...")

        has_audio = False
        try:
            probe = ffmpeg.probe(str(input_video_path))
            for stream in probe["streams"]:
                if stream["codec_type"] == "audio":
                    has_audio = True
                    break
        except Exception as e:
            logger.warning(f"Failed to probe audio: {e}, assuming no audio.")

        if has_audio:
            try:
                video_stream = ffmpeg.input(str(temp_output_path))
                audio_stream = ffmpeg.input(str(input_video_path)).audio

                (
                    ffmpeg.output(
                        video_stream,
                        audio_stream,
                        str(output_video_path),
                        vcodec="copy",
                        acodec="aac",
                    )
                    .overwrite_output()
                    .run(quiet=True)
                )
                if temp_output_path.exists():
                    temp_output_path.unlink()
                logger.info(f"Saved video with audio at: {output_video_path}")
                return
            except ffmpeg.Error as e:
                logger.error(f"FFmpeg merge failed: {e.stderr.decode() if e.stderr else str(e)}")
                logger.info("Falling back to silent video...")

        if output_video_path.exists():
            output_video_path.unlink()

        temp_output_path.rename(output_video_path)
        logger.info(f"Saved silent video (no audio found) at: {output_video_path}")


if __name__ == "__main__":
    from pathlib import Path

    input_video_path = Path("resources/19700121_1645_68e0a027836c8191a50bea3717ea7485.mp4")
    output_video_path = Path("outputs/sora_watermark_removed.mp4")
    sora_wm = DeMarkWorld()
    sora_wm.run(input_video_path, output_video_path)

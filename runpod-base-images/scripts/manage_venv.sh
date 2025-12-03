#!/usr/bin/env bash

set -e  # Exit the script if any statement returns a non-true return value

# Paths
VENV_PATH="/venv"
NETWORK_STORAGE_PATH="/workspace/backups"
BACKUP_NAME="venv_backup.zst"
BACKUP_PATH="${NETWORK_STORAGE_PATH}/${BACKUP_NAME}"

# Backup venv
backup_venv() {
    echo "Backing up $VENV_PATH to $BACKUP_PATH"

    # Ensure network storage directory exists
    mkdir -p "$NETWORK_STORAGE_PATH"

    # Check if backup file already exists
    if [ -f "$BACKUP_PATH" ]; then
        read -p "Backup file already exists. Do you want to overwrite it? (y/n): " overwrite_choice
        if [[ "$overwrite_choice" != "y" && "$overwrite_choice" != "Y" ]]; then
            echo "Backup operation cancelled."
            exit 0
        fi
    fi

    # Backup and compress venv with progress
    tar --use-compress-program="zstd -10 --long=31" -cf "$BACKUP_PATH" -C "$VENV_PATH" .

    # Ask user if they want to verify the backup
    read -p "Do you want to verify the backup? (y/n): " verify_choice
    if [[ "$verify_choice" == "y" || "$verify_choice" == "Y" ]]; then
        echo "Verifying the backup integrity"
        tar --use-compress-program="zstd -d" -tf "$BACKUP_PATH"

        if [ $? -eq 0 ]; then
            echo "Backup and verification completed successfully."
        else
            echo "Backup verification failed!" >&2
            exit 1
        fi
    else
        echo "Backup completed without verification."
    fi
}

# Restore venv
restore_venv() {
    echo "Restoring $VENV_PATH from $BACKUP_PATH"

    # Ensure the venv directory exists
    mkdir -p "$VENV_PATH"

    # Restore and decompress venv with progress
    tar --use-compress-program="zstd -d --long=31" -xf "$BACKUP_PATH" -C "$VENV_PATH"

    echo "Restore completed successfully."
}

# Main function
main() {
    if [ "$1" == "backup" ]; then
        backup_venv
    elif [ "$1" == "restore" ]; then
        restore_venv
    else
        echo "Usage: $0 {backup|restore}"
        exit 1
    fi
}

main "$@"

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
            <div className="w-full max-w-md">
                <SignIn
                    appearance={{
                        elements: {
                            rootBox: "w-full mx-auto",
                            card: "bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 shadow-2xl w-full",
                            headerTitle: "text-white",
                            headerSubtitle: "text-gray-400",
                            socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
                            socialButtonsBlockButtonText: "text-white",
                            formFieldLabel: "text-gray-300",
                            formFieldInput: "bg-[#1a1a1a] border-white/10 text-white",
                            footerActionLink: "text-primary hover:text-blue-400",
                        }
                    }}
                />
            </div>
        </main>
    );
}

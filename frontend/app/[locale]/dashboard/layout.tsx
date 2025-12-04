// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}

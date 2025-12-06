'use client';

export default function GlobalError({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <h2>Error</h2>
                <button onClick={() => reset()}>Reset</button>
            </body>
        </html>
    );
}

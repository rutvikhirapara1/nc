import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'Vendor Pay Hub',description:'Vendor payment and bill reminder portal'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

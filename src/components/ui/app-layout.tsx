import { ReactNode } from 'react';
import Link from 'next/link';
import { WalletButton } from '../solana/solana-provider';
import image from "../image.png";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className='h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col justify-between p-4 '
      style={{
        backgroundImage: `url(${image.src})`
      }}
    >
      <div className='h-screen w-screen absolute top-0 left-0 backdrop-blur-md '></div>
      <div className='flex justify-between items-center'>
        <div className='relative z-10 '>
          <Link href="/">
            <img src="/solana-logo.png" height={24} alt="Solana Logo" />
          </Link>
        </div>
        <div>
          <WalletButton />
        </div>
      </div>
      <div className='h-full w-full'>{children}</div>
    </div>
  );
}
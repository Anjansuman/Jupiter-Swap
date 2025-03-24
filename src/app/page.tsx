'use client'

import { useEffect } from 'react';
import image from "../components/image.png";
// import styles from './page.module.css';

function Page() {

  useEffect(() => {
    // Dynamically load the Jupiter script
    const script = document.createElement('script');
    script.src = "https://terminal.jup.ag/main-v2.js";
    script.onload = () => launchJupiter(); // Initialize Jupiter after the script loads
    document.head.appendChild(script);
  }, []);

  function launchJupiter() {
    if (window.Jupiter) {
      window.Jupiter.init({ 
        displayMode: "integrated",
        integratedTargetId: "integrated-terminal",
        endpoint: `${process.env.ALCHEMY_SOLANA_RPC_URL}`,
        strictTokenList: false,
        defaultExplorer: "SolanaFM",
        formProps: {
          initialAmount: "888888880000",
          initialInputMint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
          initialOutputMint: "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
        },
      });
    } else {
      console.error("Jupiter script not loaded yet");
    }
  }
  return (
    <div className='h-full w-full bg-cover bg-center bg-no-repeat flex items-center justify-center rounded-xl '
      style={{
        backgroundImage: `url(${image.src})`
      }}
    >

      <div id="integrated-terminal"
        className='w-full h-full backdrop-blur-lg rounded-xl'
      ></div>

    </div>
  );
}

export default Page;
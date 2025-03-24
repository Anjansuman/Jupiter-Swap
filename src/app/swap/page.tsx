'use client';

// import styles from './swap.module.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction, Connection } from '@solana/web3.js';
import React, { useState, useEffect, useCallback } from 'react';

const assets = [
  { name: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9},
  { name: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6},
  { name: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
  { name: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6},
];

const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number
) => {
  let timeout: NodeJS.Timeout | undefined;

  return (...args: T) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function Swap() {
  const [fromAsset, setFromAsset] = useState(assets[0]);
  const [toAsset, setToAsset] = useState(assets[1]);
  const [fromAmount, setFromAmount] = useState(0);
  const [toAmount, setToAmount] = useState(0);
  const [quoteResponse, setQuoteResponse] = useState(null);

  const wallet = useWallet();

  // Need a custom RPC so you don't get rate-limited, don't rely on users' wallets
  const connection = new Connection(
    'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE'
  );

  const handleFromAssetChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setFromAsset(
      assets.find((asset) => asset.name === event.target.value) || assets[0]
    );
  };

  const handleToAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setToAsset(
      assets.find((asset) => asset.name === event.target.value) || assets[0]
    );
  };

  const handleFromValueChange = (
    event: React.ChangeEvent<HTMLInputElement>
    ) => {
      setFromAmount(Number(event.target.value));
    };
    
  const debounceQuoteCall = useCallback(debounce(getQuote, 500), []);

  useEffect(() => {
    debounceQuoteCall(fromAmount);
  }, [fromAmount, debounceQuoteCall]);

  async function getQuote(currentAmount: number) {
    if (isNaN(currentAmount) || currentAmount <= 0) {
      console.error('Invalid fromAmount value:', currentAmount);
      return;
    }

    const quote = await (
      await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${fromAsset.mint}&outputMint=${toAsset.mint}&amount=${currentAmount * Math.pow(10, fromAsset.decimals)}&slippage=0.5`
      )
    ).json();

    if (quote && quote.outAmount) {
      const outAmountNumber =
        Number(quote.outAmount) / Math.pow(10, toAsset.decimals);
      setToAmount(outAmountNumber);
    }

    setQuoteResponse(quote);
  }

  async function signAndSendTransaction() {
    if (!wallet.connected || !wallet.signTransaction) {
      console.error(
        'Wallet is not connected or does not support signing transactions'
      );
      return;
    }

    // get serialized transactions for the swap
    const { swapTransaction } = await (
      await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: wallet.publicKey?.toString(),
          wrapAndUnwrapSol: true,
          // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
          // feeAccount: "fee_account_public_key"
        }),
      })
    ).json();

    try {
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      const signedTransaction = await wallet.signTransaction(transaction);

      const rawTransaction = signedTransaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2,
      });

      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txid
      }, 'confirmed');
      
      console.log(`https://solscan.io/tx/${txid}`);

    } catch (error) {
      console.error('Error signing or sending the transaction:', error);
    }
  }

  return (
    <div className="relative z-20 h-full w-full flex justify-center items-center">
      <div className="backdrop-blur-lg rounded-2xl p-6 w-[400px] shadow-lg border-2 border-[#ffffff10] ">
        {/* Sell Section */}
        <div className="bg-[#111] rounded-xl p-4 mb-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-2">Sell</div>
          <div className="flex justify-between items-center">
            <input
                type="text" // Change to text to prevent default number behavior
                value={fromAmount}
                onChange={(e) => {
                    const value = e.target.value.replace(/^0+/, ""); // Remove leading zeros
                    handleFromValueChange; // Call your handler with updated value
                }}
                placeholder="0"
                className="bg-transparent text-white text-2xl w-full outline-none appearance-none"
                inputMode="decimal" // Allow only numbers on mobile keyboards
                pattern="[0-9]*" // Restrict input to numbers only
                onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault(); // Disable up/down keys
                }}
            />
            <select
              value={fromAsset.name}
              onChange={handleFromAssetChange}
              className="bg-[#222] text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
            >
              {assets.map((asset) => (
                <option key={asset.mint} value={asset.name}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-gray-500 text-sm">$0</div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center items-center -my-2">
          <div className="bg-[#111] p-2 rounded-full border border-gray-800">
            ⬇️
          </div>
        </div>

        {/* Buy Section */}
        <div className="bg-[#111] rounded-xl p-4 mt-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-2">Buy</div>
          <div className="flex justify-between items-center">
            <input
              type="number"
              value={toAmount}
              className="bg-transparent text-white text-2xl w-full outline-none"
              readOnly
            />
            <select
              value={toAsset.name}
              onChange={handleToAssetChange}
              className="bg-[#222] text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
            >
              {assets.map((asset) => (
                <option key={asset.mint} value={asset.name}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={signAndSendTransaction}
          className="mt-4 w-full py-3 text-center text-lg bg-purple-900 text-pink-400 rounded-xl font-semibold hover:bg-purple-800 transition disabled:opacity-50"
          disabled={toAsset.mint === fromAsset.mint}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

/*

  return (
    <div className={"relative z-20 h-full w-full flex justify-center items-center"}>
      <div className={''}>
        <div className={''}>
          <div className={''}>You pay</div>
          <input
            type="number"
            value={fromAmount}
            onChange={handleFromValueChange}
            className={'px-2 py-4 '}
          />
          <select
            value={fromAsset.name}
            onChange={handleFromAssetChange}
            className={'px-'}
          >
            {assets.map((asset) => (
              <option key={asset.mint} value={asset.name}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        <div className={''}>
          <div className={''}>You receive</div>
          <input
            type="number"
            value={toAmount}
            // onChange={(e) => setToAmount(Number(e.target.value))}
            className={''}
            readOnly
          />
          <select
            value={toAsset.name}
            onChange={handleToAssetChange}
            className={''}
          >
            {assets.map((asset) => (
              <option key={asset.mint} value={asset.name}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={signAndSendTransaction}
          className={''}
          disabled={toAsset.mint === fromAsset.mint}
        >
          Swap
        </button>
      </div>
    </div>
  );

*/




/* Sample quote response

    {
      "inputMint": "So11111111111111111111111111111111111111112",
      "inAmount": "100000000",
      "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "outAmount": "9998099",
      "otherAmountThreshold": "9948109",
      "swapMode": "ExactIn",
      "slippageBps": 50,
      "platformFee": null,
      "priceImpactPct": "0.000146888216121999999999995",
      "routePlan": [
        {
          "swapInfo": {
            "ammKey": "HcoJqG325TTifs6jyWvRJ9ET4pDu12Xrt2EQKZGFmuKX",
            "label": "Whirlpool",
            "inputMint": "So11111111111111111111111111111111111111112",
            "outputMint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
            "inAmount": "100000000",
            "outAmount": "10003121",
            "feeAmount": "4",
            "feeMint": "So11111111111111111111111111111111111111112"
          },
          "percent": 100
        },
        {
          "swapInfo": {
            "ammKey": "ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq",
            "label": "Meteora DLMM",
            "inputMint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
            "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "inAmount": "10003121",
            "outAmount": "9998099",
            "feeAmount": "1022",
            "feeMint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
          },
          "percent": 100
        }
      ],
      "contextSlot": 242289509,
      "timeTaken": 0.002764025
    }
    */
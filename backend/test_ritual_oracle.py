import asyncio
import os
import pathlib
from dotenv import load_dotenv

load_dotenv(dotenv_path=pathlib.Path(__file__).parent.parent / ".env")

import app
from pydantic import BaseModel

class EvaluateReq(BaseModel):
    symbol: str = "BTC"
    pair: str = "BTC/USDT"
    strategy: str = "signals"
    timeframe: str = "4h"

async def main():
    print("[TEST] Testing evaluate_signal on Ritual Chain (ID 1979)...")
    req = app.EvaluateRequest(symbol="BTC", pair="BTC/USDT", strategy="signals", timeframe="4h")
    
    res = await app.evaluate_signal(req)
    print("\n[RESULT] Evaluate Response:")
    print(res)

    tx_hash = res.get("eval_tx_hash")
    req_id = res.get("request_id")

    if tx_hash:
        print(f"\n[POLL] Polling status for tx: {tx_hash}...")
        for attempt in range(1, 15):
            st = app.get_signal_status(tx_hash=tx_hash, request_id=req_id)
            print(f"Attempt {attempt}: {st.get('status')} ({st.get('stage', '')})")
            if st.get("status") == "done":
                print("\n🎉 Signal Settled!")
                print(st.get("signal"))
                break
            await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(main())

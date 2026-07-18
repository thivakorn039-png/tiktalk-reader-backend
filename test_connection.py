import asyncio
from TikTokLive import TikTokLiveClient
import traceback

async def main():
    try:
        client = TikTokLiveClient(unique_id="emsandy9763")
        await client.start()
    except Exception as e:
        print("EXCEPTION CAUGHT:")
        print(f"Type: {type(e)}")
        print(f"Message: {str(e)}")
        print(f"Repr: {repr(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

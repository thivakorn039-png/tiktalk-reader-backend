import asyncio
import sys
from TikTokLive import TikTokLiveClient
from TikTokLive.events import CommentEvent

async def main():
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        username = "vtuber"
    
    print(f"Connecting to {username}...")
    client = TikTokLiveClient(unique_id=username)
    
    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        print("Comment received!")
        print(dir(event.user))
        if hasattr(event.user, 'info'):
            print("user.info:")
            print(dir(event.user.info))
            print("badges:", getattr(event.user.info, 'badges', None))
        client.stop()
        
    await client.start()

if __name__ == "__main__":
    asyncio.run(main())

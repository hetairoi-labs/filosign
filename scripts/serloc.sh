DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(cd "$DIR/.." && pwd)"
cd "$ROOT_DIR"

clear

while true; do
cd "$ROOT_DIR/packages/contracts"


if ! pgrep -f "hardhat node" > /dev/null; then
    bunx --bun hardhat node &
    HARDHAT_PID=$!
    STARTED_HARDHAT=true
    echo "Hardhat node started with PID $HARDHAT_PID"
else
    STARTED_HARDHAT=false
    echo "Hardhat node already running"
fi

bun run compile
FC_PVT_KEY="0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e" bunx --bun hardhat run --network localhost scripts/deploy-world.ts
FC_PVT_KEY="0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e" bunx --bun hardhat run --network localhost scripts/localfund.ts
cd "$ROOT_DIR/packages/server"
DB_NAME="test" bun run scripts/drop-test.ts
DB_NAME="test" bun run db:push

pkill -f "bun run index.ts" 2>/dev/null || true
lsof -ti:30011 | xargs kill -9 2>/dev/null || true
sleep 1

RUNTIME_CHAIN_ID="31337" DB_NAME="test" bun run index.ts &
SERVER_PID=$!

echo "Server started with PID $SERVER_PID"
echo -e "\033[36mPress 'r' to restart the server, 'R' to reset everything, 'q' to quit.\033[0m"

while true; do
    read -n 1 -s key
    if [[ $key == "r" ]]; then
        echo "Restarting server..."
        pkill -f "bun run index.ts"
        lsof -ti:30011 | xargs kill -9 2>/dev/null || true
        sleep 1
        RUNTIME_CHAIN_ID="31337" DB_NAME="test" bun run index.ts &
        SERVER_PID=$!
        echo "Server restarted with PID $SERVER_PID"
    elif [[ $key == "R" ]]; then
        echo "Resetting everything..."
        pkill -f "bun run index.ts"
        pkill -f "hardhat node"
        lsof -ti:30011 | xargs kill -9 2>/dev/null || true
        lsof -ti:8545 | xargs kill -9 2>/dev/null || true
        sleep 2
        break
    elif [[ $key == "q" ]]; then
        echo "Quitting..."
        pkill -f -9 "bun run index.ts"
        if $STARTED_HARDHAT; then
            kill $HARDHAT_PID 2>/dev/null
        fi
        exit 0
    fi
done
done

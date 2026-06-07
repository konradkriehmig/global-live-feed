find ~ -name "config.yml" 2>/dev/null
sudo cloudflared --config <</YOUR_PATH>> service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
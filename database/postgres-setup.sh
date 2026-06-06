sudo apt update
sudo apt install -y postgresql
sudo systemctl enable postgresql
sudo systemctl start postgresql

sudo systemctl status postgresql

#create db user
sudo -u postgres psql
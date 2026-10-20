#!/bin/bash
set -euo pipefail

# ── System update ─────────────────────────────────────────────────────────────
yum update -y
yum install -y git --allowerasing


# ── Swap (2GB) for memory stability on t3.small / t3.micro ────────────────────
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi


# ── Install k3s (lightweight Kubernetes — includes metrics-server for HPA) ────
# INSTALL_K3S_EXEC flags:
#   --disable traefik  → we don't need the default ingress controller
#   --write-kubeconfig-mode 644 → allows ec2-user to read without sudo
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik --write-kubeconfig-mode 644" sh -

# ── Wait for k3s to be fully ready ───────────────────────────────────────────
echo "Waiting for k3s to be ready..."
until k3s kubectl get nodes | grep -q "Ready"; do
  sleep 5
done
echo "k3s is ready."

# ── Set KUBECONFIG for ec2-user ───────────────────────────────────────────────
echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> /home/ec2-user/.bashrc

# ── Add kubectl alias for ec2-user ────────────────────────────────────────────
echo 'alias k=kubectl' >> /home/ec2-user/.bashrc

# ── Clone the repo (GitHub Actions will pull updates, this is for initial setup)
# Replace with your actual repo URL
# git clone https://github.com/YOUR_USERNAME/aegis-api.git /opt/aegis

echo "Bootstrap complete. k3s node is ready."

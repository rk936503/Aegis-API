variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type for k3s node. Recommended: t3.small (2 vCPU, 2GB RAM, ~$14/28 days) or t3.micro (1GB RAM, free tier)."
  type        = string
  default     = "t3.small"
}

variable "public_key_path" {
  description = "Path to your SSH public key file (used to create EC2 key pair)"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH and view Prometheus. Restrict to your IP: 'x.x.x.x/32'"
  type        = string
  default     = "0.0.0.0/0"  # ⚠️ Change this to your IP before applying
}

variable "enable_rds" {
  description = "Set to true to provision AWS RDS PostgreSQL. Default false because in-cluster PostgreSQL pod is already included in k8s."
  type        = bool
  default     = false
}

variable "postgres_password" {
  description = "Master password for RDS PostgreSQL (only used if enable_rds is true)"
  type        = string
  default     = "aegis_postgres_pass_123"
  sensitive   = true
}


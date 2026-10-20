terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Data: Latest Amazon Linux 2023 AMI ───────────────────────────────────────
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
  filter {
    name   = "state"
    values = ["available"]
  }
}

# ── VPC ───────────────────────────────────────────────────────────────────────
resource "aws_vpc" "aegis" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "aegis-vpc" }
}

# ── Subnets (2 AZs required for RDS subnet group) ────────────────────────────
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.aegis.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags = { Name = "aegis-public-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.aegis.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
  tags = { Name = "aegis-public-b" }
}

# Private subnets for RDS (best practice — DB not publicly accessible)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.aegis.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}a"
  tags = { Name = "aegis-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.aegis.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "${var.aws_region}b"
  tags = { Name = "aegis-private-b" }
}

# ── Internet Gateway ──────────────────────────────────────────────────────────
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.aegis.id
  tags   = { Name = "aegis-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.aegis.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "aegis-rt-public" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# ── Security Groups ───────────────────────────────────────────────────────────

# EC2 / k3s node
resource "aws_security_group" "ec2" {
  name        = "aegis-ec2-sg"
  description = "k3s node - SSH, API Gateway, k3s API server"
  vpc_id      = aws_vpc.aegis.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "API Gateway (NodePort)"
    from_port   = 30500
    to_port     = 30500
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "k3s API server (GitHub Actions kubectl)"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "aegis-ec2-sg" }
}

# RDS — only reachable from the EC2 security group (if enabled)
resource "aws_security_group" "rds" {
  count       = var.enable_rds ? 1 : 0
  name        = "aegis-rds-sg"
  description = "RDS PostgreSQL - only accessible from k3s node"
  vpc_id      = aws_vpc.aegis.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "aegis-rds-sg" }
}

# ── SSH Key Pair ──────────────────────────────────────────────────────────────
resource "aws_key_pair" "aegis" {
  key_name   = "aegis-key"
  public_key = file(pathexpand(var.public_key_path))
}


# ── EC2 — k3s Node (t3.small recommended: 2 vCPU / 2GB RAM) ───────────────────
# t3.small costs ~$0.021/hr ≈ $14.50 for 28 days (well within your $116 credit)
# t3.micro has only 1GB RAM — too tight for k3s + 4 services + metrics server + Redis
resource "aws_instance" "aegis" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.aegis.key_name
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  user_data              = file("${path.module}/user_data.sh")

  root_block_device {
    volume_size = 20
    volume_type = "gp2"
    encrypted   = true
  }

  tags = { Name = "aegis-k3s-node" }
}

resource "aws_eip" "aegis" {
  instance = aws_instance.aegis.id
  domain   = "vpc"
  tags     = { Name = "aegis-eip" }
}

# ── RDS — db.t3.micro PostgreSQL (Optional: disabled by default) ─────────────
# By default, Aegis uses in-cluster PostgreSQL pod (infra/k8s/postgres).
# Set enable_rds = true in terraform.tfvars if you want AWS-managed RDS instead.
resource "aws_db_subnet_group" "aegis" {
  count       = var.enable_rds ? 1 : 0
  name        = "aegis-db-subnet-group"
  description = "Subnet group for Aegis RDS"
  subnet_ids  = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  tags        = { Name = "aegis-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  count          = var.enable_rds ? 1 : 0
  identifier     = "aegis-postgres"

  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro"  # FREE TIER: 750 hrs/month

  allocated_storage = 20           # FREE TIER: up to 20 GB
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = "aegis_auth"          # Initial database (auth service)
  username = "postgres"
  password = var.postgres_password

  db_subnet_group_name   = aws_db_subnet_group.aegis[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]

  publicly_accessible     = false  # Private — only reachable within VPC
  multi_az                = false  # Single-AZ keeps it free
  backup_retention_period = 1      # 1 day automated backup (free)
  skip_final_snapshot     = true   # For dev — set false in production

  tags = { Name = "aegis-postgres" }
}


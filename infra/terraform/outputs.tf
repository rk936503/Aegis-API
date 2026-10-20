output "instance_public_ip" {
  description = "Elastic IP of the k3s EC2 node"
  value       = aws_eip.aegis.public_ip
}

output "api_gateway_url" {
  description = "Public URL of the API Gateway (NodePort 30500)"
  value       = "http://${aws_eip.aegis.public_ip}:30500"
}


output "ssh_command" {
  description = "SSH into the EC2 instance"
  value       = "ssh -i ~/.ssh/id_rsa ec2-user@${aws_eip.aegis.public_ip}"
}

output "get_kubeconfig" {
  description = "Fetch the k3s kubeconfig (update server IP before using)"
  value       = "ssh -i ~/.ssh/id_rsa ec2-user@${aws_eip.aegis.public_ip} 'sudo cat /etc/rancher/k3s/k3s.yaml' | sed 's/127.0.0.1/${aws_eip.aegis.public_ip}/g'"
}

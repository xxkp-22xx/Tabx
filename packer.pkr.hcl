packer {
  required_plugins {
    docker = {
      source  = "github.com/hashicorp/docker"
      version = "~> 1.0"
    }
  }
}

source "docker" "my_docker_image" {
  image  = "ubuntu:20.04"
  commit = true
}

build {
  sources = ["source.docker.my_docker_image"]

  provisioner "shell" {
    inline = [
      "export DEBIAN_FRONTEND=noninteractive",
      "apt-get update -y",
      "apt-get install -y apt-utils ca-certificates curl gnupg lsb-release tzdata",
      "mkdir -p /etc/apt/keyrings",
      "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | tee /etc/apt/keyrings/docker.asc",
      "echo \"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\" | tee /etc/apt/sources.list.d/docker.list > /dev/null",
      "apt-get update -y",
      "apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin"
    ]
  }

  post-processor "docker-tag" {
      repository = "s3cloudhub/my-app"
    tag        = ["latest", "v1.0.0"]
  }
}

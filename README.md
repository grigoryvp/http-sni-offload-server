# http-sni-offload-server

Minimal haproxy+node Docker container that offloads http(s) without decryption

## Usage

Assume you have an Ubuntu box and want to run 2 Docker containers with
different HTTPS websites and certificates inside containers, not inside
some "union" nginx that will terminate both. First install Docker:

```sh
curl -LSs https://get.docker.com/ | sh
sudo usermod -aG docker $USER # Don't forget to relogin!
sudo service docker start
sudo systemctl enable docker.service
```

Docker disables name resolution for default network, so create a new
one:
```sh
docker network create int
```

Build and this container and configure it for auto restart:
```sh
docker build --tag="http-sni-offload-server" https://github.com/grigoryvp/http-sni-offload-server.git
docker run --restart=always --net=int --name="http-sni-offload-server" -d http-sni-offload-server
```

Backends register themselves by sending HTTP POST request to
http-sni-offload-server hostname on port 8080 with with json as request
body. `cmd` key should contain `register` string; `domains` key should
contain a list of domain name this backend handles, ex:
```sh
curl --data '{"cmd": "register", "domains": ["foo.ru"]}' http-sni-offload-server:8080
```


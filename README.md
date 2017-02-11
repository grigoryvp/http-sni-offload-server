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
docker run --restart=always --net=int -p 0.0.0.0:80:80 -p 0.0.0.0:443:443 --name="http-sni-offload-server" -d http-sni-offload-server
```

Backends register themselves by sending HTTP POST request to
http-sni-offload-server hostname on port 8080 with with json as request
body. `cmd` key should contain `register` string; `domains` key should
contain a list of domain name this backend handles. For example, following
manual Docker container will register itself to handle all HTTP and HTTPS
requests to the "foo.ru" domain:
```sh
docker run --net=int --name="test" -it ubuntu:16.10
apt-get update -qq && apt-get install -yqq curl apt-utils
curl --data '{"cmd": "register", "domains": ["foo.ru"]}' http-sni-offload-server:8080
curl -LSs https://deb.nodesource.com/setup_7.x | bash -
apt-get install -yqq nodejs
npm install http-server
mkdir ./public
echo test > ./public/index.html
node ./node_modules/.bin/http-server -p 80
```


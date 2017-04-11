const express = require('express');
const fs = require('fs');
const child_process = require('child_process');


const backends = {};
let haproxyProcess = null;


const app = express();
app.set('ip', '0.0.0.0');
app.set('port', 8080);
app.use(require('body-parser').json({type: '*/*'}));

app.listen(app.get('port'), app.get('ip'), () => {
  console.log(`server started on ${app.get('ip')}:${app.get('port')}`);
});

app.all('/', (req, res) => {
  switch(req.body.cmd) {
    case 'register':
      if (req.body.domains && req.body.domains.length > 0) {
        let isChanged = false;
        for (const domain of req.body.domains) {
          if (!/[\w]/.test(domain)) continue;
          const domainSafe = encodeURIComponent(domain);
          const address = req.socket.remoteAddress;
          const old = backends[domainSafe];
          backends[domainSafe] = address;
          if (old !== address) {
            isChanged = true;
          }
        }
        if (isChanged) {
          return update(() => res.status(200).send("ok\n"));
        }
        else {
          return res.status(200).send("already registered\n");
        }
      }
      else {
        return res.status(400).send("'domains' value is not a list\n");
      }
    case 'update':
      return update(() => res.status(200).send("ok\n"));
    default:
      return res.status(400).send("unknown 'cmd' value\n");
  }
});


function update(next) {
  let config = [
    'defaults',
    '  timeout connect 5000',
    '  timeout client  50000',
    '  timeout server  50000',
    '  option forceclose',
    '',
    'frontend in-http',
    '  bind 0.0.0.0:80',
    '  mode tcp',
    '  default_backend out-http',
    '',
    'frontend in-https',
    '  bind 0.0.0.0:443',
    '  mode tcp',
    '  tcp-request inspect-delay 5s',
    '  tcp-request content accept if { req.ssl_hello_type 1 }',
    '  default_backend out-https',
    '',
  ];

  let configHttp = [
    'backend out-http',
    '  mode http',
  ];

  let configHttps = [
    'backend out-https',
    '  mode tcp',
  ];

  const domains = Object.keys(backends);
  for(let i = 0; i < domains.length; i ++) {
    configHttp.push([
      `  acl is-server-${i} hdr_dom(host) -i ${domains[i]}`,
    ].join("\n"));
    configHttps.push([
      `  acl is-server-${i} req.ssl_sni -i ${domains[i]}`,
    ].join("\n"));
  }
  for(let i = 0; i < domains.length; i ++) {
    configHttp.push([
      `  use-server server-${i} if is-server-${i}`,
    ].join("\n"));
    configHttps.push([
      `  use-server server-${i} if is-server-${i}`,
    ].join("\n"));
  }
  for(let i = 0; i < domains.length; i ++) {
    configHttp.push([
      `  server server-${i} ${backends[domains[i]]}:80`,
    ].join("\n"));
    configHttps.push([
      `  server server-${i} ${backends[domains[i]]}:443`,
    ].join("\n"));
  }

  config.push('');
  config.push(...configHttp);
  config.push('');
  config.push(...configHttps);
  config.push('');
  const filename = '/etc/haproxy/haproxy.cfg';
  fs.writeFile(filename, config.join("\n"), 'utf-8', () => {
    if (haproxyProcess) haproxyProcess.kill();
    const args = ['-f', filename];
    haproxyProcess = child_process.spawn('/usr/sbin/haproxy', args);
    next();
  });
}


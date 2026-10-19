// Local live-sync server for the browser demo. Bind to loopback; it has no real account authentication.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8766);
const HOST = '127.0.0.1';
const DATA_FILE = path.join(ROOT, 'server-data.json');
const AUTH_FILE = path.join(ROOT, 'auth-users.json');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const peers = new Set();
const sessions = new Map();
const passwordResets = new Map();
let state = null;
let accounts = [];
try { state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') console.error('Could not read live state:', error.message); }
try { accounts = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') console.error('Could not read local accounts:', error.message); }

function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function sendState(res, state, req) {
  const json=JSON.stringify({state}),accept=String(req.headers['accept-encoding']||'');
  if(json.length<1200||!/(^|,\s*)gzip\b/i.test(accept))return send(res,200,{state});
  zlib.gzip(json,{level:5},(error,compressed)=>{
    if(error)return send(res,200,{state});
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Encoding':'gzip','Vary':'Accept-Encoding','X-Content-Type-Options':'nosniff'});
    res.end(compressed);
  });
}
function broadcast(sourceId) {
  const frame = `data: ${JSON.stringify({sourceId,updatedAt:Date.now()})}\n\n`;
  for (const peer of peers) { try { peer.write(frame); } catch { peers.delete(peer); } }
}
function writeState(next, sourceId) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next), {encoding:'utf8',mode:0o600});
  fs.renameSync(tmp, DATA_FILE);
  state = next;
  broadcast(sourceId || '');
}
function readBody(req) {
  return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>1024*1024){reject(new Error('Request too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'));}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);});
}
function cookieValue(req,name) {
  const cookies=String(req.headers.cookie||'').split(';').map(x=>x.trim());
  const item=cookies.find(x=>x.startsWith(name+'='));
  return item?decodeURIComponent(item.slice(name.length+1)):'';
}
function signedInUser(req) {
  const session=sessions.get(cookieValue(req,'tc_session'));
  if(!session)return null;
  if(session.userId==='u1')return {id:'u1',name:'Aarav Rao',email:'aarav@example.test',admin:true,demo:true};
  const account=accounts.find(x=>x.id===session.userId);
  return account?{id:account.id,name:account.name,email:account.email,admin:false,demo:false}:null;
}
function createSession(res,userId) {
  const token=crypto.randomBytes(32).toString('hex');
  sessions.set(token,{userId,createdAt:Date.now()});
  res.setHeader('Set-Cookie',`tc_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
}
function saveAccounts(){const tmp=AUTH_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(accounts),{encoding:'utf8',mode:0o600});fs.renameSync(tmp,AUTH_FILE);}

const server = http.createServer((req,res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if(url.pathname==='/auth/me'&&req.method==='GET')return send(res,200,{user:signedInUser(req)});
  if(url.pathname==='/auth/logout'&&req.method==='POST'){const token=cookieValue(req,'tc_session');sessions.delete(token);res.setHeader('Set-Cookie','tc_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
  if(url.pathname==='/auth/demo'&&req.method==='POST'){createSession(res,'u1');return send(res,200,{user:{id:'u1',name:'Aarav Rao',email:'aarav@example.test',admin:true,demo:true}});}
  if(url.pathname==='/auth/forgot'&&req.method==='POST'){
    readBody(req).then(data=>{const email=String(data.email||'').trim().toLowerCase(),account=accounts.find(x=>x.email===email);let resetUrl=null;if(account){const token=crypto.randomBytes(32).toString('hex');passwordResets.set(token,{userId:account.id,expiresAt:Date.now()+10*60*1000});resetUrl=`http://${HOST}:${PORT}/reset-password.html?token=${token}`;}return send(res,200,{message:'If a matching local account exists, a one-time reset link is ready.',resetUrl});}).catch(()=>send(res,400,{error:'Could not read the reset request.'}));return;
  }
  if(url.pathname==='/auth/reset'&&req.method==='POST'){
    readBody(req).then(data=>{const token=String(data.token||''),password=String(data.password||''),reset=passwordResets.get(token);if(!reset||reset.expiresAt<Date.now()){passwordResets.delete(token);return send(res,400,{error:'This reset link is invalid or has expired. Request a new one.'});}if(password.length<10)return send(res,422,{error:'Use a password with at least 10 characters.'});const account=accounts.find(x=>x.id===reset.userId);if(!account){passwordResets.delete(token);return send(res,400,{error:'This reset link is invalid or has expired. Request a new one.'});}account.salt=crypto.randomBytes(16).toString('hex');account.hash=crypto.scryptSync(password,account.salt,64).toString('hex');saveAccounts();for(const [key,value] of passwordResets)if(value.userId===account.id)passwordResets.delete(key);for(const [key,value] of sessions)if(value.userId===account.id)sessions.delete(key);return send(res,200,{ok:true,message:'Password updated. You can sign in with your new password.'});}).catch(()=>send(res,400,{error:'Could not reset the password.'}));return;
  }
  if(url.pathname==='/auth/signup'&&req.method==='POST'){
    readBody(req).then(data=>{const name=String(data.name||'').trim(),email=String(data.email||'').trim().toLowerCase(),password=String(data.password||'');if(name.length<2||name.length>70)return send(res,422,{error:'Enter a name from 2 to 70 characters.'});if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return send(res,422,{error:'Enter a valid email address.'});if(password.length<10)return send(res,422,{error:'Use a password with at least 10 characters.'});if(accounts.some(x=>x.email===email))return send(res,409,{error:'An account already uses that email.'});const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(password,salt,64).toString('hex');const account={id:'u_'+crypto.randomBytes(8).toString('hex'),name,email,salt,hash,createdAt:new Date().toISOString()};accounts.push(account);saveAccounts();createSession(res,account.id);return send(res,201,{user:{id:account.id,name,email,admin:false,demo:false}});}).catch(()=>send(res,400,{error:'Could not read sign-up details.'}));return;
  }
  if(url.pathname==='/auth/login'&&req.method==='POST'){
    readBody(req).then(data=>{const email=String(data.email||'').trim().toLowerCase(),password=String(data.password||''),account=accounts.find(x=>x.email===email);if(!account)return send(res,401,{error:'Email or password is incorrect.'});const candidate=crypto.scryptSync(password,account.salt,64);if(!crypto.timingSafeEqual(candidate,Buffer.from(account.hash,'hex')))return send(res,401,{error:'Email or password is incorrect.'});createSession(res,account.id);return send(res,200,{user:{id:account.id,name:account.name,email:account.email,admin:false,demo:false}});}).catch(()=>send(res,400,{error:'Could not read sign-in details.'}));return;
  }
  if(url.pathname.startsWith('/live/')&&!signedInUser(req))return send(res,401,{error:'Sign in first.'});
  if (url.pathname === '/live/state' && req.method === 'GET') {
    const user=signedInUser(req);
    if(!state)return sendState(res,state,req);
    if(user?.demo)return sendState(res,state,req);
    const visible=structuredClone(state),tripIds=new Set((state.members||[]).filter(m=>m.userId===user.id&&m.status==='accepted').map(m=>m.tripId));
    visible.locations=(state.locations||[]).filter(item=>tripIds.has(item.tripId));
    return sendState(res,visible,req);
  }
  if (url.pathname === '/live/state' && req.method === 'POST') {
    let raw='';
    req.on('data',chunk=>{raw+=chunk;if(raw.length>15*1024*1024){send(res,413,{error:'Demo data is too large.'});req.destroy();}});
    req.on('end',()=>{try{const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.users)||!Array.isArray(parsed.trips))return send(res,400,{error:'Invalid demo state.'});const user=signedInUser(req);parsed.locations=Array.isArray(parsed.locations)?parsed.locations:[];if(!user?.demo){const allowedTrips=new Set((state?.members||[]).filter(m=>m.userId===user?.id&&m.status==='accepted').map(m=>m.tripId));const valid=parsed.locations.filter(item=>item.userId===user?.id&&allowedTrips.has(item.tripId)&&Number.isFinite(Number(item.latitude))&&Number.isFinite(Number(item.longitude))&&Number(item.latitude)>=-90&&Number(item.latitude)<=90&&Number(item.longitude)>=-180&&Number(item.longitude)<=180&&Number(item.expiresAt)>Date.now()&&Number(item.expiresAt)<=Date.now()+366*24*60*60*1000);const preserved=(state?.locations||[]).filter(item=>item.userId!==user?.id);parsed.locations=[...preserved,...valid];}writeState(parsed,String(req.headers['x-client-id']||''));send(res,200,{ok:true,updatedAt:Date.now()});}catch(error){send(res,400,{error:'Could not save demo state.'});}});
    return;
  }
  if (url.pathname === '/live/events' && req.method === 'GET') {
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(`data: ${JSON.stringify({sourceId:'',updatedAt:Date.now()})}\n\n`);
    peers.add(res);
    const heartbeat=setInterval(()=>{try{res.write(': keep-alive\n\n');}catch{clearInterval(heartbeat);peers.delete(res);}},20000);
    req.on('close',()=>{clearInterval(heartbeat);peers.delete(res);});
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res,405,{error:'Method not allowed.'});
  let pathname;
  try { pathname=decodeURIComponent(url.pathname); } catch { return send(res,400,{error:'Invalid path.'}); }
  // The local site entry point is always the sign-in screen. Authenticated
  // navigation uses /index.html after an explicit sign-in or demo selection.
  if (pathname === '/') { res.writeHead(302,{Location:'/login.html','Cache-Control':'no-store'});return res.end(); }
  if(['/server-data.json','/server-data.json.tmp','/auth-users.json','/auth-users.json.tmp','/config.php','/config.example.php'].includes(pathname))return send(res,404,{error:'Not found.'});
  if(pathname==='/index.html'&&!signedInUser(req)){res.writeHead(302,{Location:'/login.html','Cache-Control':'no-store'});return res.end();}
  const file=path.resolve(ROOT,'.'+pathname);
  if (!file.startsWith(ROOT+path.sep)) return send(res,403,{error:'Forbidden.'});
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile())return send(res,404,{error:'Not found.'});
    const ext=path.extname(file),etag=`W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`,isStatic=['.css','.js','.svg','.png','.jpg','.jpeg','.webp'].includes(ext);
    if(isStatic&&req.headers['if-none-match']===etag){res.writeHead(304,{'ETag':etag,'Cache-Control':'public, max-age=0, must-revalidate'});return res.end();}
    const headers={'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':isStatic?'public, max-age=0, must-revalidate':'no-cache','X-Content-Type-Options':'nosniff'};if(isStatic)headers.ETag=etag;
    res.writeHead(200,headers);
    if(req.method==='HEAD')return res.end();
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT,HOST,()=>console.log(`Trip Companion live demo: http://${HOST}:${PORT}/`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});


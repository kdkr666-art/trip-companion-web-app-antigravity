(() => {
  const loginForm=document.getElementById('loginForm');
  const signupForm=document.getElementById('signupForm');
  const title=document.getElementById('formTitle');
  const intro=document.getElementById('formIntro');
  const eyebrow=document.getElementById('formEyebrow');
  function setMode(mode){
    const signup=mode==='signup';
    loginForm.classList.toggle('hidden',signup);signupForm.classList.toggle('hidden',!signup);document.getElementById('forgotForm').classList.add('hidden');document.getElementById('authTabs').classList.remove('hidden');
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    title.textContent=signup?'Create your account':'Sign in to your account';
    intro.textContent=signup?'Create your account, then set your travel style and preferences.':'Pick up where your travel plans left off.';
    eyebrow.textContent=signup?'JOIN THE TRAVEL CREW':'WELCOME BACK';
    document.querySelectorAll('.auth-error').forEach(x=>x.textContent='');
  }
  function showForgot(){loginForm.classList.add('hidden');signupForm.classList.add('hidden');document.getElementById('forgotForm').classList.remove('hidden');document.getElementById('authTabs').classList.add('hidden');title.textContent='Reset your password';intro.textContent='Enter the email used for your local account.';eyebrow.textContent='ACCOUNT RECOVERY';document.getElementById('forgotError').textContent='';document.getElementById('resetResult').classList.add('hidden');document.querySelector('#forgotForm [name="email"]').value=document.querySelector('#loginForm [name="email"]').value;}
  async function submit(endpoint,form,errorId){
    const button=form.querySelector('button[type="submit"]'),original=button.innerHTML;
    button.disabled=true;button.textContent='Please wait…';document.getElementById(errorId).textContent='';
    try{
      const response=await fetch('/auth/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
      const result=await response.json();if(!response.ok){if(endpoint==='login'&&response.status===401)document.getElementById('forgotLink').classList.remove('hidden');throw new Error(result.error||'Could not sign in.');}
      sessionStorage.removeItem('tc-demo-user');sessionStorage.setItem('tc-auth-user',result.user.id);sessionStorage.setItem('tc-auth-profile',JSON.stringify(result.user));
      if(endpoint==='signup')sessionStorage.setItem('tc-onboarding-pending',result.user.id);
      location.href='/index.html';
    }catch(error){document.getElementById(errorId).textContent=error.message||'The local server could not be reached.';button.disabled=false;button.innerHTML=original;}
  }
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
  loginForm.addEventListener('submit',event=>{event.preventDefault();submit('login',loginForm,'loginError');});
  signupForm.addEventListener('submit',event=>{event.preventDefault();submit('signup',signupForm,'signupError');});
  document.getElementById('forgotLink').addEventListener('click',showForgot);
  document.getElementById('backToLogin').addEventListener('click',()=>setMode('login'));
  document.getElementById('forgotForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]'),resultBox=document.getElementById('resetResult');button.disabled=true;button.textContent='Preparing link…';document.getElementById('forgotError').textContent='';resultBox.classList.add('hidden');try{const response=await fetch('/auth/forgot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:new FormData(form).get('email')})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not create a reset link.');resultBox.replaceChildren();const msg=document.createElement('p');msg.textContent=result.message;resultBox.appendChild(msg);if(result.resetUrl){const link=document.createElement('a');link.href=result.resetUrl;link.textContent='Open the one-time reset link';resultBox.appendChild(link);}resultBox.classList.remove('hidden');}catch(error){document.getElementById('forgotError').textContent=error.message||'The local server could not be reached.';}finally{button.disabled=false;button.innerHTML='Create reset link <span>→</span>';}});
  document.getElementById('demoButton').addEventListener('click',async()=>{
    const button=document.getElementById('demoButton');button.disabled=true;
    try{const response=await fetch('/auth/demo',{method:'POST'});const result=await response.json();if(!response.ok)throw new Error('Demo sign-in failed.');sessionStorage.removeItem('tc-auth-user');sessionStorage.removeItem('tc-auth-profile');sessionStorage.removeItem('tc-demo-prompt-shown');sessionStorage.setItem('tc-demo-user',result.user.id);location.href='/index.html';}
    catch{button.disabled=false;document.getElementById('loginError').textContent='The local server could not be reached.';setMode('login');}
  });
  if(new URLSearchParams(location.search).get('mode')==='signup')setMode('signup');
})();

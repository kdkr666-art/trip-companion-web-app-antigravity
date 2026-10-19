(() => {
  const form=document.getElementById('resetForm'),error=document.getElementById('resetError');
  const token=new URLSearchParams(location.search).get('token')||'';
  form.addEventListener('submit',async event=>{
    event.preventDefault();error.textContent='';const data=new FormData(form),password=String(data.get('password')||''),confirmPassword=String(data.get('confirmPassword')||'');
    if(password!==confirmPassword){error.textContent='The passwords do not match.';return;}
    const button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent='Updating…';
    try{const response=await fetch('/auth/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not reset the password.');error.classList.add('success');error.textContent=result.message;form.reset();setTimeout(()=>location.href='/login.html',1800);}
    catch(e){error.classList.remove('success');error.textContent=e.message||'The local server could not be reached.';button.disabled=false;button.innerHTML='Update password <span>→</span>';}
  });
})();

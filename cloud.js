/* Conexão pública do Laudo em Dia com o Supabase.
   A chave publishable abaixo é própria para uso em páginas públicas. */
const LaudoCloud=(()=>{
  const url='https://hooqlmuptbzzocepgrai.supabase.co';
  const key='sb_publishable_1SvQ4FWiGqysGb_BYEGoLA_svFvpwUX';
  const sessionKey='laudoEmDia.supabase.session.v1';
  const publicColumns='id,protocol,title,unit,address,inspection_date,completed_date,delivery_date,status,progress,responsible,crea,notes,published,pdf_url,pdf_name,source,created_at,updated_at';

  function storedSession(){try{return JSON.parse(localStorage.getItem(sessionKey))}catch{return null}}
  function saveSession(value){if(value)localStorage.setItem(sessionKey,JSON.stringify(value));else localStorage.removeItem(sessionKey)}
  function authHeaders(token){return {apikey:key,Authorization:`Bearer ${token||key}`}}
  async function request(path,{method='GET',body,token,headers={}}={}){
    const response=await fetch(url+path,{method,headers:{...authHeaders(token),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
    const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
    if(!response.ok){const message=data?.message||data?.msg||data?.error_description||data?.hint||data?.details||data||`Erro ${response.status}`;throw new Error(String(message))}
    return data;
  }
  async function signIn(email,password){
    const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    const session={...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)};saveSession(session);return session;
  }
  async function session(){
    let current=storedSession();if(!current)return null;
    if((current.expires_at||0)>Math.floor(Date.now()/1000)+60)return current;
    try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:current.refresh_token}});current={...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)};saveSession(current);return current}catch{saveSession(null);return null}
  }
  function signOut(){saveSession(null)}
  async function listReports(token){
    const select=encodeURIComponent(token?'*':publicColumns);
    return request(`/rest/v1/reports?select=${select}&order=updated_at.desc`,{token});
  }
  async function createReport(payload,token){return request('/rest/v1/reports?select=*',{method:'POST',body:payload,token,headers:{Prefer:'return=representation'}}).then(x=>x[0])}
  async function updateReport(id,payload,token){return request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&select=*`,{method:'PATCH',body:payload,token,headers:{Prefer:'return=representation'}}).then(x=>x[0])}
  async function deleteReport(id,token){return request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',token})}
  async function upload(bucket,path,file,token){
    const response=await fetch(`${url}/storage/v1/object/${bucket}/${path}`,{method:'POST',headers:{...authHeaders(token),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
    const text=await response.text();let data;try{data=text?JSON.parse(text):{}}catch{data={message:text}}
    if(!response.ok)throw new Error(data?.message||data?.error||`Falha ao enviar ${file.name}`);
    return data;
  }
  function publicFileUrl(bucket,path){return `${url}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`}
  async function signedFileUrl(bucket,path,token){const encoded=path.split('/').map(encodeURIComponent).join('/');const data=await request(`/storage/v1/object/sign/${bucket}/${encoded}`,{method:'POST',body:{expiresIn:3600},token});const signed=data?.signedURL||data?.signedUrl;return signed?.startsWith('http')?signed:`${url}/storage/v1${signed}`}
  async function addAttachment(payload,token){return request('/rest/v1/attachments',{method:'POST',body:payload,token,headers:{Prefer:'return=minimal'}})}
  async function listAttachments(reportId,token){return request(`/rest/v1/attachments?report_id=eq.${encodeURIComponent(reportId)}&select=*&order=created_at.asc`,{token})}
  async function submitRequest(payload){return request('/rest/v1/rpc/submit_report_request',{method:'POST',body:payload}).then(x=>x[0])}
  async function registerRequestPhoto(payload){return request('/rest/v1/rpc/register_request_photo',{method:'POST',body:payload})}
  async function listNotifications(token){return request('/rest/v1/notifications?select=*&audience=eq.admin&order=created_at.desc',{token})}
  async function markNotificationsRead(token){return request('/rest/v1/notifications?audience=eq.admin&is_read=eq.false',{method:'PATCH',body:{is_read:true},token,headers:{Prefer:'return=minimal'}})}

  return {url,key,session,signIn,signOut,listReports,createReport,updateReport,deleteReport,upload,publicFileUrl,signedFileUrl,addAttachment,listAttachments,submitRequest,registerRequestPhoto,listNotifications,markNotificationsRead};
})();

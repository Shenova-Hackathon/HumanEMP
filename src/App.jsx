import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AudioLines, BookOpenText, Check, ChevronRight, CircleHelp, Copy, FileText, Headphones, House, Languages, LockKeyhole, Menu, Mic, Moon, Pause, Play, ScanLine, Settings as SettingsIcon, ShieldCheck, Sparkles, Square, Sun, Upload, Volume2, X } from 'lucide-react';
import { explainText, extractText, translateText } from './services/api.js';

const nav = [
  { to: '/', label: 'Overview', icon: House, end: true },
  { to: '/read', label: 'Read Text', icon: ScanLine },
  { to: '/listen', label: 'Speech to Text', icon: AudioLines },
  { to: '/speak', label: 'Speak Text', icon: Volume2 },
  { to: '/simplify', label: 'Simplify Information', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function App() {
  const [prefs, setPrefs] = useState(() => {
    try { return { size: 'regular', contrast: false, motion: false, theme: 'light', ...JSON.parse(localStorage.getItem('shenova-prefs') || '{}') }; }
    catch { return { size: 'regular', contrast: false, motion: false, theme: 'light' }; }
  });
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { localStorage.setItem('shenova-prefs', JSON.stringify(prefs)); }, [prefs]);
  useEffect(() => { document.documentElement.dataset.size = prefs.size; document.documentElement.dataset.contrast = prefs.contrast; document.documentElement.dataset.motion = prefs.motion; document.documentElement.dataset.theme = prefs.theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', prefs.theme === 'dark' ? '#211c27' : '#f8f7f4'); }, [prefs]);
  useEffect(() => {
    const scale = prefs.size === 'large' ? 1.15 : prefs.size === 'larger' ? 1.3 : 1;
    const restore = () => document.querySelectorAll('[data-a11y-font-size]').forEach(element => {
      element.style.fontSize = element.dataset.a11yOriginalFontSize || '';
      element.style.lineHeight = element.dataset.a11yOriginalLineHeight || '';
      delete element.dataset.a11yFontSize;
      delete element.dataset.a11yOriginalFontSize;
      delete element.dataset.a11yOriginalLineHeight;
    });
    const apply = () => {
      restore();
      document.querySelectorAll('body *').forEach(element => {
        if (element.closest('svg') || ['SCRIPT', 'STYLE', 'LINK', 'META'].includes(element.tagName)) return;
        const computed = window.getComputedStyle(element);
        const fontSize = Number.parseFloat(computed.fontSize);
        if (!Number.isFinite(fontSize)) return;
        element.dataset.a11yFontSize = 'true';
        element.dataset.a11yOriginalFontSize = element.style.fontSize;
        element.dataset.a11yOriginalLineHeight = element.style.lineHeight;
        if (scale !== 1) {
          element.style.fontSize = `${fontSize * scale}px`;
          const lineHeight = Number.parseFloat(computed.lineHeight);
          if (computed.lineHeight.endsWith('px') && Number.isFinite(lineHeight)) element.style.lineHeight = `${lineHeight * scale}px`;
        }
      });
    };
    apply();
    const observer = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) apply();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', apply);
    return () => { observer.disconnect(); window.removeEventListener('resize', apply); restore(); };
  }, [prefs.size]);
  return <div className="app-shell">
    <button className="mobile-menu" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu /></button>
    <button className="theme-toggle" type="button" onClick={()=>setPrefs(p=>({...p,theme:p.theme==='dark'?'light':'dark'}))} aria-label={`Switch to ${prefs.theme==='dark'?'light':'dark'} mode`} title={`Switch to ${prefs.theme==='dark'?'light':'dark'} mode`}>{prefs.theme==='dark'?<Moon size={17}/>:<Sun size={17}/>}<span>{prefs.theme==='dark'?'Dark':'Light'}</span></button>
    {drawer && <button className="drawer-scrim" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
    <aside className={`sidebar ${drawer ? 'sidebar-open' : ''}`}>
      <div className="brand"><Link to="/" className="brand-mark" aria-label="Shenova AI home"><span className="mark-orbit"/><span className="mark-core"/></Link><div><Link to="/" className="brand-name">shenova<span> ai</span></Link><div className="brand-tag">Access information. Your way.</div></div><button className="close-drawer" aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={19}/></button></div>
      <div className="nav-label">YOUR SPACE</div>
      <nav aria-label="Main navigation">{nav.map(({to,label,icon:Icon,end})=><NavLink onClick={()=>setDrawer(false)} key={to} to={to} end={end} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{label==='Settings'&&<ChevronRight className="nav-chevron" size={15}/>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="reminder"><div className="reminder-icon"><CircleHelp size={17}/></div><div><b>Your space, your pace.</b><span>Adjust things to feel right for you.</span><Link to="/settings">Accessibility preferences <ChevronRight size={12}/></Link></div></div><div className="privacy-indicator"><ShieldCheck size={15}/><span>Your privacy comes first</span></div></div>
    </aside>
    <main className="main-area"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/read" element={<ReadPage/>}/><Route path="/listen" element={<ListenPage/>}/><Route path="/speak" element={<SpeakPage/>}/><Route path="/simplify" element={<SimplifyPage/>}/><Route path="/settings" element={<SettingsPage prefs={prefs} setPrefs={setPrefs}/>}/><Route path="*" element={<Dashboard/>}/></Routes><footer className="page-footer"><span>Made for the way you experience the world.</span><span>SHENOVA AI <span className="footer-dot">·</span> ACCESSIBILITY, WITH YOU IN MIND</span></footer></main>
  </div>;
}

function Topline({eyebrow, title, description, children}) { return <header className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{children}</header>; }
function Dashboard() {
  const actions=[{to:'/read',label:'Read Text',desc:'Turn printed words into something you can hear.',cta:'Start reading',kind:'read',icon:ScanLine},{to:'/listen',label:'Speech to Text',desc:'Turn spoken words into clear, readable text.',cta:'Start listening',kind:'listen',icon:Mic},{to:'/speak',label:'Speak Text',desc:'Give your typed words a voice.',cta:'Start speaking',kind:'speak',icon:Volume2},{to:'/simplify',label:'Simplify Information',desc:'Make complicated information easier to understand.',cta:'Simplify now',kind:'simplify',icon:Sparkles}];
  return <div className="content dashboard-content"><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/>YOUR ACCESSIBILITY SPACE</div><h1>Technology that<br/><em>understands</em> your needs.</h1><p>Your everyday companion for reading, listening, speaking and understanding information.</p><Link to="/read" className="button button-dark">Explore your tools <ChevronRight size={16}/></Link></div><div className="hero-art" aria-hidden="true"><div className="hero-sun"/><div className="paper paper-back"/><div className="paper paper-mid"/><div className="paper paper-front"><span className="paper-kicker">A LITTLE MORE<br/>INDEPENDENCE</span><span className="paper-rule"/><span className="paper-scribble"/><span className="paper-caption">at your fingertips</span></div><span className="art-sparkle">✳</span><span className="art-note">A space that<br/>works for you</span></div><div className="hero-index">01 <span/> 04</div></section>
    <section className="tools-section"><div className="section-heading"><div><div className="eyebrow">HERE WHEN YOU NEED THEM</div><h2>Start with what you need.</h2></div><span className="section-aside">Four thoughtful ways to make<br/>information more accessible.</span></div><div className="tool-grid">{actions.map(a=><Link to={a.to} className={`tool-card ${a.kind}`} key={a.label}><div className="tool-top"><span className="tool-icon"><a.icon size={19} strokeWidth={1.7}/></span><span className="tool-arrow"><ChevronRight size={17}/></span></div><div className="card-visual" aria-hidden="true">{a.kind==='read'?<div className="doc-illustration"><div className="doc-lines"><b/><i/><i/><i/></div><span className="scan-line"/></div>:a.kind==='listen'?<div className="wave-illustration">{Array.from({length:23},(_,i)=><i key={i} style={{'--h':`${14+((i*17)%34)}px`}}/>)}</div>:a.kind==='speak'?<div className="player-illustration"><span className="play-mini"><Play size={12} fill="currentColor"/></span><span className="player-line"><i/></span><small>0:08</small></div>:<div className="simplify-illustration"><span>COMPLICATED</span><i>↓</i><b>clear &amp; simple</b></div>}</div><div className="tool-text"><h3>{a.label}</h3><p>{a.desc}</p><span className="text-cta">{a.cta} <ChevronRight size={15}/></span></div></Link>)}</div></section>
    <section className="lower-grid"><div className="recent-section"><div className="section-heading compact"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Continue where you left off.</h2></div></div><div className="recent-empty"><div className="recent-symbol"><BookOpenText size={19}/></div><div><b>Your recent activity will live here.</b><p>When you use a tool, it will be easy to find again.</p></div><span className="sample-tag">SAMPLE SPACE</span></div></div><div className="privacy-card"><div className="privacy-icon"><LockKeyhole size={17}/></div><div><div className="eyebrow">A PROMISE TO YOU</div><h3>Your information<br/>belongs to you.</h3><p>SHENOVA is designed around privacy, user control and responsible technology.</p><Link to="/settings">Explore privacy settings <ChevronRight size={14}/></Link></div><div className="privacy-flower" aria-hidden="true">✳</div></div></section>
  </div>;
}

function useSpeechPlayback(){
  const [status,setStatus]=useState('idle');
  const [message,setMessage]=useState('');
  const [voices,setVoices]=useState([]);
  const utterance=useRef(null);
  const requestId=useRef(0);
  useEffect(()=>{
    if(!window.speechSynthesis)return;
    const synthesis=window.speechSynthesis;
    const loadVoices=()=>setVoices(synthesis.getVoices());
    loadVoices();
    const previousVoicesHandler=synthesis.onvoiceschanged;
    if(synthesis.addEventListener)synthesis.addEventListener('voiceschanged',loadVoices);
    else synthesis.onvoiceschanged=loadVoices;
    return()=>{
      requestId.current++;
      synthesis.cancel();
      if(synthesis.removeEventListener)synthesis.removeEventListener('voiceschanged',loadVoices);
      else if(synthesis.onvoiceschanged===loadVoices)synthesis.onvoiceschanged=previousVoicesHandler;
      utterance.current=null;
    };
  },[]);
  function play(text,{language='en-US',voiceName='',rate=1,pitch=1,volume=1}={}){
    const cleanText=text?.trim();
    if(!cleanText){setMessage('Enter or paste some text before playing.');return;}
    if(!window.speechSynthesis||typeof window.SpeechSynthesisUtterance!=='function'){
      setStatus('idle');setMessage('Text to speech is not supported in this browser.');return;
    }
    const synthesis=window.speechSynthesis;
    const id=++requestId.current;
    setStatus('queued');
    setMessage('Preparing audio…');
    try{
      synthesis.cancel();
      const utteranceObject=new window.SpeechSynthesisUtterance(cleanText);
      utteranceObject.lang=language;
      utteranceObject.rate=rate;
      utteranceObject.pitch=pitch;
      utteranceObject.volume=volume;
      const selectedVoice=voices.find(item=>item.voiceURI===voiceName||item.name===voiceName);
      if(selectedVoice)utteranceObject.voice=selectedVoice;
      utteranceObject.onstart=()=>{if(id===requestId.current){setStatus('speaking');setMessage('Speaking now.');}};
      utteranceObject.onend=()=>{if(id===requestId.current){setStatus('idle');setMessage('Playback finished.');utterance.current=null;}};
      utteranceObject.onerror=event=>{
        if(id!==requestId.current)return;
        setStatus('idle');
        setMessage(event.error==='not-allowed'?'Speech playback was blocked by the browser. Check your audio permissions.':'Speech playback stopped unexpectedly. Please try again.');
        utterance.current=null;
      };
      utterance.current=utteranceObject;
      synthesis.speak(utteranceObject);
    }catch{setStatus('idle');setMessage('Could not start speech playback. Please try again.');utterance.current=null;}
  }
  function pause(){if(status==='speaking'&&window.speechSynthesis){try{window.speechSynthesis.pause();setStatus('paused');setMessage('Playback paused.');}catch{setMessage('Could not pause playback. Please try again.');}}}
  function resume(){if(status==='paused'&&window.speechSynthesis){try{window.speechSynthesis.resume();setStatus('speaking');setMessage('Speaking now.');}catch{setMessage('Could not resume playback. Please try again.');}}}
  function stop(){requestId.current++;try{window.speechSynthesis?.cancel();}catch{setMessage('Could not stop playback. Please try again.');return;}utterance.current=null;setStatus('idle');setMessage('Playback stopped.');}
  return {status,message,setMessage,voices,play,pause,resume,stop};
}

function VoiceSettings({language,setLanguage,voice,setVoice,voices,idPrefix,rate,setRate,pitch,setPitch,volume,setVolume,onPreview,previewDisabled,showLanguage=true}){
  const languageCode=language.split('-')[0].toLowerCase();
  const matching=voices.filter(item=>item.lang.toLowerCase().startsWith(languageCode));
  function changeLanguage(event){const nextLanguage=event.target.value;const code=nextLanguage.split('-')[0].toLowerCase();const nextVoice=voices.find(item=>item.lang.toLowerCase().startsWith(code));setLanguage(nextLanguage);setVoice(nextVoice?.voiceURI||nextVoice?.name||'');}
  return <>
    <div className="voice-settings">
      {showLanguage&&<div className="field"><label htmlFor={`${idPrefix}-language`}>Language</label><div className="select-wrap"><Languages size={15}/><select id={`${idPrefix}-language`} value={language} onChange={changeLanguage}><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option><option value="en-IN">English (India)</option><option value="hi-IN">हिन्दी</option><option value="es-ES">Español</option><option value="fr-FR">Français</option></select></div></div>}
      <div className="field"><label htmlFor={`${idPrefix}-voice`}>Voice <span>(from your device)</span></label><div className="select-wrap"><Volume2 size={15}/><select id={`${idPrefix}-voice`} value={voice} onChange={event=>setVoice(event.target.value)}><option value="">Default voice{matching.length?'':' (no matching voice found)'}</option>{matching.map(item=><option key={`${item.voiceURI}-${item.lang}`} value={item.voiceURI||item.name}>{item.name} ({item.lang})</option>)}</select></div></div>
    </div>
    <div className="speech-tuning">
      <div className="field"><label htmlFor={`${idPrefix}-rate`}>Speech speed</label><div className="select-wrap"><select id={`${idPrefix}-rate`} value={rate} onChange={event=>setRate(Number(event.target.value))}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></div></div>
      <div className="field"><label htmlFor={`${idPrefix}-pitch`}>Voice pitch <output>{pitch.toFixed(1)}</output></label><input id={`${idPrefix}-pitch`} type="range" min="0" max="2" step="0.1" value={pitch} onChange={event=>setPitch(Number(event.target.value))}/></div>
      <div className="field"><label htmlFor={`${idPrefix}-volume`}>Volume <output>{Math.round(volume*100)}%</output></label><input id={`${idPrefix}-volume`} type="range" min="0" max="1" step="0.05" value={volume} onChange={event=>setVolume(Number(event.target.value))}/></div>
      <button type="button" className="button button-outline preview-voice" onClick={onPreview} disabled={previewDisabled}><Play size={14} fill="currentColor"/> Preview voice</button>
    </div>
  </>;
}
function ReadPage(){
  const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[result,setResult]=useState(''),[busy,setBusy]=useState(false),[language,setLanguage]=useState('en-US'),[voice,setVoice]=useState(''),[rate,setRate]=useState(1),[pitch,setPitch]=useState(1),[volume,setVolume]=useState(1);
  const input=useRef();
  const playback=useSpeechPlayback();
  function choose(selected){if(!selected)return;setFile(selected);setResult('');playback.stop();playback.setMessage('');if(preview)URL.revokeObjectURL(preview);setPreview(selected.type.startsWith('image/')?URL.createObjectURL(selected):'');}
  async function extract(){if(!file){playback.setMessage('Choose a file first, or paste text below.');return;}setBusy(true);playback.setMessage('');try{setResult(await extractText(file));}catch(error){playback.setMessage(error.message);}finally{setBusy(false);}}
  function clear(){playback.stop();setFile(null);setResult('');playback.setMessage('');if(preview)URL.revokeObjectURL(preview);setPreview('');if(input.current)input.current.value='';}
  return <div className="content feature-content"><Topline eyebrow="READ TEXT" title="Let your words be heard." description="Bring a printed page into focus, or paste text to listen right away."/><div className="feature-layout read-layout"><section className="panel upload-panel"><div className="panel-head"><div><span className="step-number">01</span><h2>Choose a page</h2></div><button className="text-button" onClick={clear}>Clear <X size={14}/></button></div><input ref={input} type="file" accept="image/*,.pdf,.doc,.docx,.txt" hidden onChange={event=>choose(event.target.files?.[0])}/><div className={`drop-zone ${file?'has-file':''}`} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();choose(event.dataTransfer.files?.[0]);}}>{preview?<img className="image-preview" src={preview} alt={`Preview of ${file.name}`}/>:file?<div className="file-preview"><FileText size={34}/><b>{file.name}</b><span>{(file.size/1024).toFixed(0)} KB · Ready to process</span></div>:<> <div className="upload-icon"><Upload size={22}/></div><b>Drop your page right here</b><span>Image, PDF or text document</span></>}<button className="button button-outline" onClick={()=>input.current?.click()}>{file?'Choose another':'Browse files'}</button></div><div className="upload-options"><button className="option-link" onClick={()=>{input.current?.setAttribute('capture','environment');input.current?.setAttribute('accept','image/*');input.current?.click();}}><ScanLine size={16}/> Use your camera</button><span>Files stay on this device until you choose to process them.</span></div><button className="button button-primary wide" disabled={busy||!file} onClick={extract}>{busy?<><span className="spinner"/> Extracting text…</>:<>Extract text <ChevronRight size={16}/></>}</button></section><section className="panel result-panel"><div className="panel-head"><div><span className="step-number">02</span><h2>Your words, made clear</h2></div>{result&&<button className="text-button" onClick={async()=>{try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(result);playback.setMessage('Text copied to clipboard.');}catch{playback.setMessage('Copy is not available in this browser or permission was denied.');}}}><Copy size={14}/> Copy text</button>}</div><label className="sr-only" htmlFor="read-aloud-text">Edit, enter, or paste text to read aloud</label><textarea id="read-aloud-text" className="extracted-text" value={result} onChange={event=>setResult(event.target.value)} placeholder="Extracted text will appear here. You can also type or paste text here to listen." style={{width:'100%',minHeight:'235px',resize:'vertical',border:'1px solid #eeece8',borderRadius:'4px',background:'#fdfcfb',padding:'15px',font:'inherit',color:'inherit'}}/><VoiceSettings language={language} setLanguage={setLanguage} voice={voice} setVoice={setVoice} voices={playback.voices} idPrefix="read" rate={rate} setRate={setRate} pitch={pitch} setPitch={setPitch} volume={volume} setVolume={setVolume} onPreview={()=>playback.play(language.startsWith("hi")?"नमस्ते। यह आपकी चुनी हुई आवाज़ का नमूना है।":"Hello. This is a preview of your selected voice.",{language,voiceName:voice,rate,pitch,volume})} previewDisabled={playback.status==="queued"||playback.status==="speaking"}/><div className="audio-controls"><button className="button button-dark" onClick={()=>playback.play(result,{language,voiceName:voice,rate,pitch,volume})} disabled={!result.trim()||playback.status==='queued'||playback.status==='speaking'}><Play size={15} fill="currentColor"/> Play audio</button><button className="control-square" aria-label="Pause reading" onClick={playback.pause} disabled={playback.status!=='speaking'}><Pause size={14}/></button><button className="control-square" aria-label="Resume reading" onClick={playback.resume} disabled={playback.status!=='paused'}><Play size={13} fill="currentColor"/></button><button className="control-square" aria-label="Stop reading" onClick={playback.stop} disabled={playback.status==='idle'}><Square size={13} fill="currentColor"/></button></div>{playback.message&&<p className="status-message" role="status">{playback.message}</p>}</section></div><p className="integration-note"><ShieldCheck size={15}/> OCR is not connected yet. You can still paste or type text above to use Read aloud.</p></div>;
}
function ListenPage(){
  const [recording,setRecording]=useState(false),[starting,setStarting]=useState(false),[completed,setCompleted]=useState(false),[text,setText]=useState(''),[interim,setInterim]=useState(''),[message,setMessage]=useState(''),[supported,setSupported]=useState(true),[language,setLanguage]=useState('en-US');
  const recognitionRef=useRef(null),activeRef=useRef(false),startedAt=useRef(0),gotSpeech=useRef(false),lastError=useRef(''),interimRef=useRef('');
  useEffect(()=>()=>{const recognition=recognitionRef.current;activeRef.current=false;interimRef.current='';if(recognition){recognition.onresult=null;recognition.onerror=null;recognition.onend=null;recognition.onstart=null;try{if(typeof recognition.abort==='function')recognition.abort();else recognition.stop();}catch{try{recognition.stop()}catch{}}recognitionRef.current=null;}},[]);
  function stop(){const recognition=recognitionRef.current;if(!activeRef.current)return;try{if(starting&&typeof recognition?.abort==='function')recognition.abort();else recognition?.stop();}catch{activeRef.current=false;recognitionRef.current=null;setStarting(false);setRecording(false);setMessage('Recording stopped.');}}
  function appendTranscript(fragment){const clean=fragment.trim();if(!clean)return;setText(previous=>`${previous}${previous&&!/\s$/.test(previous)?' ':''}${clean} `);}
  async function copyTranscript(){try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(text);setMessage('Transcription copied.')}catch{setMessage('Copy is not available in this browser or permission was denied.')}}
  function start(){
    if(activeRef.current)return;
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){setSupported(false);setMessage('Speech recognition is not available in this browser. Try a recent version of Chrome or Edge.');return;}
    if(window.isSecureContext===false){setMessage('Microphone recognition requires a secure page. Open this site with HTTPS or localhost.');return;}
    setMessage('');setInterim('');interimRef.current='';setCompleted(false);gotSpeech.current=false;lastError.current='';startedAt.current=Date.now();setStarting(true);setMessage('Requesting microphone access…');
    try{
      const recognition=new Recognition();recognitionRef.current=recognition;activeRef.current=true;recognition.continuous=true;recognition.interimResults=true;recognition.lang=language;
      recognition.onstart=()=>{if(!activeRef.current){try{if(typeof recognition.abort==='function')recognition.abort();else recognition.stop();}catch{}return;}setStarting(false);setRecording(true);setMessage('Listening. Speak naturally.');};
      recognition.onresult=event=>{let finalText='',draft='';for(let index=event.resultIndex;index<event.results.length;index++){const phrase=event.results[index][0]?.transcript||'';if(event.results[index].isFinal)finalText+=phrase;else draft+=phrase;}if(finalText){gotSpeech.current=true;appendTranscript(finalText);}interimRef.current=draft;setInterim(draft);};
      recognition.onerror=event=>{const errors={'not-allowed':'Microphone permission was denied. Allow access in your browser settings and try again.','service-not-allowed':'The browser speech recognition service is unavailable. Try again or use another supported browser.','audio-capture':'No microphone was found. Connect a microphone and try again.','no-speech':'No speech was detected. Try again when you are ready.','network':'Speech recognition could not connect. Check your connection and try again.','language-not-supported':'This browser does not support the selected recognition language.','aborted':'Recording stopped.'};lastError.current=errors[event.error]||'Speech recognition stopped unexpectedly. Please try again.';setMessage(lastError.current);};
      recognition.onend=()=>{const leftover=interimRef.current;const didRecognize=gotSpeech.current||Boolean(leftover.trim());if(leftover.trim())appendTranscript(leftover);activeRef.current=false;recognitionRef.current=null;interimRef.current='';setStarting(false);setRecording(false);setInterim('');if(didRecognize){setCompleted(true);if(!lastError.current)setMessage('Transcription complete. You can edit or reuse your text.');}else if(!lastError.current&&Date.now()-startedAt.current>500){setMessage('No speech was detected. Try again when you are ready.');}};
      recognition.start();
    }catch(error){activeRef.current=false;recognitionRef.current=null;setStarting(false);setRecording(false);setMessage(error?.name==='NotAllowedError'?'Microphone permission was denied. Allow access in your browser settings and try again.':'Could not start recording. Check microphone permission and try again.');}
  }
  function clear(){setText('');setInterim('');interimRef.current='';setMessage('');setCompleted(false);}
  const active=recording||starting;
  return <div className="content feature-content"><Topline eyebrow="SPEECH TO TEXT" title="Every voice deserves to be understood." description="Speak freely. Your words appear here as readable text."/><div className="listen-layout"><section className="panel mic-panel"><div className="record-orbit"><div className={`orbit-ring ${recording?'is-recording':''}`}/><button type="button" className={`mic-button ${recording?'recording':''}`} aria-label={active?'Stop recording':'Start recording'} aria-pressed={recording} onClick={active?stop:start} style={{border:0,cursor:'pointer'}}><Mic size={31} strokeWidth={1.5}/></button><span className={`record-dot ${recording?'live':''}`}/></div><h2>{starting?'Requesting microphone…':recording?'Listening to you…':completed?'Your transcription is ready.':'Ready when you are.'}</h2><p>{recording?'Your voice is being transcribed in your browser.':starting?'Allow microphone access if your browser asks.':completed?'Review your words or send them to Speak Text.':'Select start when you’re ready to speak.'}</p><div className={`waveform ${recording?'wave-active':''}`} aria-hidden="true">{Array.from({length:35},(_,index)=><i key={index} style={{'--h':`${8+(index*13%23)}px`}}/>)}</div><div className="field language-field"><label htmlFor="recognition-language">Recognition language</label><div className="select-wrap"><Languages size={15}/><select id="recognition-language" value={language} onChange={event=>setLanguage(event.target.value)} disabled={active}><option value="en-US">English</option><option value="hi-IN">हिन्दी</option></select></div></div><button className={`button ${active?'button-stop':'button-primary'}`} onClick={active?stop:start} disabled={starting}>{starting?<><span className="spinner"/> Requesting microphone…</>:recording?<><Square size={14} fill="currentColor"/> Stop recording</>:<><Mic size={16}/> Start recording</>}</button>{message&&<p className="status-message" role="status">{message}</p>}<div className="permission-note"><LockKeyhole size={14}/> Microphone access is requested only when you start recording.</div></section><section className="panel transcript-panel"><div className="panel-head"><div><span className="step-number">LIVE NOTES</span><h2>Your transcription</h2></div><div className="button-row">{text&&<><button className="text-button" onClick={copyTranscript}><Copy size={14}/> Copy text</button><Link to="/speak" state={{text}} className="text-button">Use in Speak Text <ChevronRight size={13}/></Link><button className="text-button" onClick={clear}>Clear text <X size={14}/></button></>}</div></div><div className={`transcript-area ${text||interim?'has-text':''}`}><textarea aria-label="Edit transcription" value={text} onChange={event=>setText(event.target.value)} placeholder="What you say will appear here, ready to read and revisit." style={{width:'100%',minHeight:'190px',resize:'vertical',border:0,outline:0,background:'transparent',font:'inherit',color:'inherit'}} />{interim&&<span className="interim-text">{text&&!/\s$/.test(text)?' ':''}{interim}</span>}</div><div className="transcript-foot"><span>{text.trim()?text.trim().split(/\s+/).length:0} words</span><span>{recording?<><i className="live-small"/> RECORDING</>:starting?'REQUESTING ACCESS':completed?'TRANSCRIPTION COMPLETE':'READY TO RECORD'}</span></div></section></div><div className="integration-note"><ShieldCheck size={15}/> Speech recognition uses your browser. Availability, language support, and network requirements vary.</div>{!supported&&<div className="support-tip">You can still type or paste text in Speak Text to listen to written content.</div>}</div>;
}
function SpeakPage(){
  const location=useLocation();
  const [text,setText]=useState(()=>location.state?.text||''),[inputLanguage,setInputLanguage]=useState('en'),[outputLanguage,setOutputLanguage]=useState('hi'),[translatedText,setTranslatedText]=useState(''),[translationMeta,setTranslationMeta]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[voice,setVoice]=useState(''),[rate,setRate]=useState(1),[pitch,setPitch]=useState(1),[volume,setVolume]=useState(1);
  const playback=useSpeechPlayback();
  const targetTag=outputLanguage==='hi'?'hi-IN':'en-US';
  const matchingVoices=playback.voices.filter(item=>item.lang.toLowerCase().startsWith(outputLanguage));
  const currentTranslation=Boolean(translatedText&&translationMeta&&translationMeta.text===text&&translationMeta.source===inputLanguage&&translationMeta.target===outputLanguage);
  const selectedVoice=matchingVoices.find(item=>item.voiceURI===voice||item.name===voice)||matchingVoices[0];
  useEffect(()=>{if(selectedVoice&&voice!==selectedVoice.voiceURI)setVoice(selectedVoice.voiceURI||selectedVoice.name);},[selectedVoice,voice]);
  async function translate(){
    if(!text.trim()){setError('Enter some text before translating.');return;}
    setBusy(true);setError('');setNotice('');playback.stop();
    try{
      const result=await translateText(text,inputLanguage,outputLanguage);
      setTranslatedText(result);setTranslationMeta({text,source:inputLanguage,target:outputLanguage});
      if(inputLanguage===outputLanguage)setNotice('The languages match, so your original text is ready to speak.');
      else setNotice('Translation complete. Review or edit the translated text before listening.');
    }catch(problem){setError(problem.message);}
    finally{setBusy(false);}
  }
  function speakOutput(sample=false){
    const textToSpeak=sample?(outputLanguage==='hi'?'नमस्ते। यह चुनी हुई आवाज़ का नमूना है।':'Hello. This is a sample of the selected voice.'):(currentTranslation?translatedText:'');
    if(!selectedVoice){playback.setMessage(`No ${outputLanguage==='hi'?'Hindi':'English'} system voice is available on this device. Install or enable one in your device speech settings.`);return;}
    playback.play(textToSpeak,{language:targetTag,voiceName:selectedVoice.voiceURI||selectedVoice.name,rate,pitch,volume});
  }
  async function copyTranslation(){try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(translatedText);setNotice('Translated text copied.');}catch{setError('Copy is unavailable in this browser or clipboard permission was denied.');}}
  function clear(){playback.stop();setText('');setTranslatedText('');setTranslationMeta(null);setError('');setNotice('');playback.setMessage('');}
  return <div className="content feature-content"><Topline eyebrow="SPEAK TEXT" title="Give your words a voice." description="Translate your words between English and Hindi, then hear them in a matching system voice."/><div className="speak-layout translation-layout"><section className="panel compose-panel"><div className="panel-head"><div><span className="step-number">01 · ORIGINAL TEXT</span><h2>What would you like to say?</h2></div><button className="text-button" onClick={clear}>Clear text <X size={14}/></button></div><div className="translation-language-row"><div className="field"><label htmlFor="speak-input-language">Input language</label><div className="select-wrap"><Languages size={15}/><select id="speak-input-language" value={inputLanguage} onChange={event=>setInputLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="auto">Auto-detect</option></select></div></div><div className="field"><label htmlFor="speak-output-language">Output language</label><div className="select-wrap"><Languages size={15}/><select id="speak-output-language" value={outputLanguage} onChange={event=>{setOutputLanguage(event.target.value);setVoice('');}}><option value="en">English</option><option value="hi">हिन्दी</option></select></div></div></div><label className="sr-only" htmlFor="speak-text">Original text to translate</label><textarea id="speak-text" className="main-textarea" maxLength={5000} placeholder="Type or paste text here…" value={text} onChange={event=>{setText(event.target.value);setError('');setNotice('');}}/><div className="textarea-foot"><span>Original text stays available for review.</span><span>{text.length} / 5,000</span></div><button className="button button-primary translate-button" onClick={translate} disabled={busy||!text.trim()}>{busy?<><span className="spinner"/> Translating securely…</>:<><Languages size={15}/>{translatedText?'Translate Again':'Translate Text'} <ChevronRight size={16}/></>}</button>{error&&<p className="status-message" role="alert">{error}</p>}{notice&&<p className="translation-notice" role="status">{notice}</p>}</section><section className="panel translation-output"><div className="panel-head"><div><span className="step-number">02 · TRANSLATED TEXT</span><h2>{outputLanguage==='hi'?'Hindi':'English'} words to speak</h2></div>{translatedText&&<button className="text-button" onClick={copyTranslation}><Copy size={14}/> Copy</button>}</div><label className="sr-only" htmlFor="translated-text">Edit translated text before speaking</label><textarea id="translated-text" className="main-textarea translated-area" maxLength={5000} placeholder={busy?'Your translation will appear here…':'The real translation will appear here once translation is configured.'} value={translatedText} onChange={event=>setTranslatedText(event.target.value)} disabled={!translatedText}/>{translatedText&&!currentTranslation&&<p className="stale-translation" role="status">Source text or language changed. Translate again before playing.</p>}<VoiceSettings language={targetTag} voice={voice} setVoice={setVoice} voices={playback.voices} idPrefix="translate" rate={rate} setRate={setRate} pitch={pitch} setPitch={setPitch} volume={volume} setVolume={setVolume} onPreview={()=>speakOutput(true)} previewDisabled={!selectedVoice||playback.status==='queued'||playback.status==='speaking'} showLanguage={false}/><div className="audio-controls"><button className="button button-dark" onClick={()=>speakOutput(false)} disabled={!currentTranslation||!translatedText.trim()||!selectedVoice||playback.status==='queued'||playback.status==='speaking'}><Play size={15} fill="currentColor"/> Play translated audio</button><button className="control-square" aria-label="Pause speech" onClick={playback.pause} disabled={playback.status!=='speaking'}><Pause size={14}/></button><button className="control-square" aria-label="Resume speech" onClick={playback.resume} disabled={playback.status!=='paused'}><Play size={13} fill="currentColor"/></button><button className="control-square" aria-label="Stop speech" onClick={playback.stop} disabled={playback.status==='idle'}><Square size={13} fill="currentColor"/></button></div>{playback.message&&<p className="status-message" role="status">{playback.message}</p>}<div className="translation-foot">{currentTranslation?(selectedVoice?'Translation is ready to speak.':`No ${outputLanguage==='hi'?'Hindi':'English'} system voice is available on this device. Install or enable one in device speech settings.`):translatedText?'Translation needs refreshing.':'Waiting for text to translate.'}</div></section></div><p className="integration-note"><ShieldCheck size={15}/> Translations use the configured LibreTranslate-compatible service. Speech uses system voices available on your device.</p></div>;
}
function SimplifyPage(){const [text,setText]=useState(''),[result,setResult]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');async function simplify(){if(!text.trim()){setMessage('Paste some information to get started.');return;}setBusy(true);setMessage('');try{setResult(await explainText(text));}catch(e){setMessage(e.message);}finally{setBusy(false);}}return <div className="content feature-content"><Topline eyebrow="SIMPLIFY INFORMATION" title="Clarity begins here." description="Bring a tricky paragraph. Leave with a clearer understanding."/><div className="simplify-layout"><section className="panel simplify-input"><div className="panel-head"><div><span className="step-number">01</span><h2>What would you like help with?</h2></div><button className="text-button" onClick={()=>{setText('');setResult('');setMessage('');}}>Clear <X size={14}/></button></div><label className="sr-only" htmlFor="original">Paste the information you'd like simplified</label><textarea id="original" className="main-textarea simplify-textarea" placeholder="Paste a letter, instructions, or anything you'd like to understand more easily…" value={text} onChange={e=>setText(e.target.value)}/><div className="textarea-foot"><span>Long or short, it’s up to you.</span><span>{text.length} characters</span></div><button className="button button-primary" onClick={simplify} disabled={busy}>{busy?<><span className="spinner"/> Preparing…</>:<>Explain in simple language <ChevronRight size={16}/></>}</button>{message&&<p className="status-message" role="status">{message}</p>}<div className="example-box"><span className="example-label"><Sparkles size={13}/> EXAMPLE TO TRY</span><p>“The library will be closed on public holidays and the first Monday of each month.”</p><button onClick={()=>{setText('The library will be closed on public holidays and the first Monday of each month.');setMessage('Example added.');}}>Use this example <ChevronRight size={13}/></button></div></section><section className="simplify-output"><div className="output-head"><div><span className="step-number">02</span><h2>A clearer version</h2></div>{result&&<button className="text-button" onClick={()=>navigator.clipboard?.writeText(result).then(()=>setMessage('Simplified text copied.'))}><Copy size={14}/> Copy</button>}</div>{result?<div className="output-result">{result}</div>:<div className="output-empty"><div className="clarity-mark"><span/><span/><span/></div><h3>Understanding,<br/>made a little easier.</h3><p>Your simplified explanation will appear here.</p></div>}<div className="output-note"><ShieldCheck size={14}/> A helper for understanding, not a substitute for professional advice.</div></section></div><div className="integration-note"><Sparkles size={15}/> Simplification is not connected to an AI service yet. No result will be generated until one is configured.</div></div>}

function SettingsPage({prefs,setPrefs}){function toggle(k){setPrefs(p=>({...p,[k]:!p[k]}));}return <div className="content feature-content"><Topline eyebrow="SETTINGS & PREFERENCES" title="Make this space yours." description="Small changes can make a big difference. Choose what feels comfortable."/><div className="settings-layout"><section className="panel settings-panel"><div className="settings-intro"><div className="settings-icon"><SettingsIcon size={19}/></div><div><h2>Accessibility preferences</h2><p>These settings stay on this device and apply throughout SHENOVA.</p></div></div><div className="setting-row"><div><h3>Text size</h3><p>Choose a comfortable reading size.</p></div><div className="segmented" role="group" aria-label="Text size">{[['regular','Regular'],['large','Large'],['larger','Larger']].map(([v,label])=><button key={v} className={prefs.size===v?'selected':''} aria-pressed={prefs.size===v} onClick={()=>setPrefs({...prefs,size:v})}>{label}</button>)}</div></div><div className="setting-row"><div><h3>High contrast</h3><p>Make text and controls stand out more.</p></div><Toggle checked={prefs.contrast} onChange={()=>toggle('contrast')} label="High contrast"/></div><div className="setting-row"><div><h3>Reduce motion</h3><p>Keep movement and animation to a minimum.</p></div><Toggle checked={prefs.motion} onChange={()=>toggle('motion')} label="Reduce motion"/></div></section><section className="settings-privacy"><div className="privacy-icon"><LockKeyhole size={17}/></div><div className="eyebrow">YOUR CONTROL MATTERS</div><h2>Your privacy,<br/>on your terms.</h2><p>Accessibility preferences are saved locally in this browser. Your recent activity is not tracked or sent anywhere.</p><div className="privacy-status"><Check size={15}/> Preferences stored on this device</div></section></div><div className="integration-note"><ShieldCheck size={15}/> Your preferences are saved automatically in this browser.</div></div>}
function Toggle({checked,onChange,label}){return <button className={`toggle ${checked?'on':''}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span/></button>}

export default App;

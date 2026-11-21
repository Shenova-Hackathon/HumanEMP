import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AudioLines, BookOpenText, Check, ChevronRight, CircleHelp, Copy, FileText, Headphones, House, Languages, LockKeyhole, Menu, Mic, Pause, Play, ScanLine, Settings as SettingsIcon, ShieldCheck, Sparkles, Square, Upload, Volume2, X } from 'lucide-react';
import { explainText, extractText } from './services/api.js';

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
    try { return { size: 'regular', contrast: false, motion: false, ...JSON.parse(localStorage.getItem('shenova-prefs') || '{}') }; }
    catch { return { size: 'regular', contrast: false, motion: false }; }
  });
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { localStorage.setItem('shenova-prefs', JSON.stringify(prefs)); }, [prefs]);
  useEffect(() => { document.documentElement.dataset.size = prefs.size; document.documentElement.dataset.contrast = prefs.contrast; document.documentElement.dataset.motion = prefs.motion; }, [prefs]);
  return <div className="app-shell">
    <button className="mobile-menu" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu /></button>
    {drawer && <button className="drawer-scrim" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
    <aside className={`sidebar ${drawer ? 'sidebar-open' : ''}`}>
      <div className="brand"><Link to="/" className="brand-mark" aria-label="Shenova AI home"><span className="mark-orbit"/><span className="mark-core"/></Link><div><Link to="/" className="brand-name">shenova<span> ai</span></Link><div className="brand-tag">Access information. Your way.</div></div><button className="close-drawer" aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={19}/></button></div>
      <div className="nav-label">YOUR SPACE</div>
      <nav aria-label="Main navigation">{nav.map(({to,label,icon:Icon,end})=><NavLink onClick={()=>setDrawer(false)} key={to} to={to} end={end} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{label==='Settings'&&<ChevronRight className="nav-chevron" size={15}/>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="reminder"><div className="reminder-icon"><CircleHelp size={17}/></div><div><b>Your space, your pace.</b><span>Adjust things to feel right for you.</span><Link to="/settings">Accessibility preferences <ChevronRight size={12}/></Link></div></div><div className="privacy-indicator"><ShieldCheck size={15}/><span>Your privacy comes first</span></div></div>
    </aside>
    <main className="main-area"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/read" element={<ReadPage/>}/><Route path="/listen" element={<ListenPage/>}/><Route path="/speak" element={<SpeakPage/>}/><Route path="/simplify" element={<SimplifyPage/>}/><Route path="/settings" element={<SettingsPage prefs={prefs} setPrefs={setPrefs}/>}/><Route path="*" element={<Dashboard/>}/></Routes><footer className="page-footer"><span>Made for the way you experience the world.</span><span>SHENOVA AI <span className="footer-dot">Â·</span> ACCESSIBILITY, WITH YOU IN MIND</span></footer></main>
  </div>;
}

function Topline({eyebrow, title, description, children}) { return <header className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{children}</header>; }
function Dashboard() {
  const actions=[{to:'/read',label:'Read Text',desc:'Turn printed words into something you can hear.',cta:'Start reading',kind:'read',icon:ScanLine},{to:'/listen',label:'Speech to Text',desc:'Turn spoken words into clear, readable text.',cta:'Start listening',kind:'listen',icon:Mic},{to:'/speak',label:'Speak Text',desc:'Give your typed words a voice.',cta:'Start speaking',kind:'speak',icon:Volume2},{to:'/simplify',label:'Simplify Information',desc:'Make complicated information easier to understand.',cta:'Simplify now',kind:'simplify',icon:Sparkles}];
  return <div className="content dashboard-content"><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/>YOUR ACCESSIBILITY SPACE</div><h1>Technology that<br/><em>understands</em> your needs.</h1><p>Your everyday companion for reading, listening, speaking and understanding information.</p><Link to="/read" className="button button-dark">Explore your tools <ChevronRight size={16}/></Link></div><div className="hero-art" aria-hidden="true"><div className="hero-sun"/><div className="paper paper-back"/><div className="paper paper-mid"/><div className="paper paper-front"><span className="paper-kicker">A LITTLE MORE<br/>INDEPENDENCE</span><span className="paper-rule"/><span className="paper-scribble"/><span className="paper-caption">at your fingertips</span></div><span className="art-sparkle">âœ³</span><span className="art-note">A space that<br/>works for you</span></div><div className="hero-index">01 <span/> 04</div></section>
    <section className="tools-section"><div className="section-heading"><div><div className="eyebrow">HERE WHEN YOU NEED THEM</div><h2>Start with what you need.</h2></div><span className="section-aside">Four thoughtful ways to make<br/>information more accessible.</span></div><div className="tool-grid">{actions.map(a=><Link to={a.to} className={`tool-card ${a.kind}`} key={a.label}><div className="tool-top"><span className="tool-icon"><a.icon size={19} strokeWidth={1.7}/></span><span className="tool-arrow"><ChevronRight size={17}/></span></div><div className="card-visual" aria-hidden="true">{a.kind==='read'?<div className="doc-illustration"><div className="doc-lines"><b/><i/><i/><i/></div><span className="scan-line"/></div>:a.kind==='listen'?<div className="wave-illustration">{Array.from({length:23},(_,i)=><i key={i} style={{'--h':`${14+((i*17)%34)}px`}}/>)}</div>:a.kind==='speak'?<div className="player-illustration"><span className="play-mini"><Play size={12} fill="currentColor"/></span><span className="player-line"><i/></span><small>0:08</small></div>:<div className="simplify-illustration"><span>COMPLICATED</span><i>â†“</i><b>clear &amp; simple</b></div>}</div><div className="tool-text"><h3>{a.label}</h3><p>{a.desc}</p><span className="text-cta">{a.cta} <ChevronRight size={15}/></span></div></Link>)}</div></section>
    <section className="lower-grid"><div className="recent-section"><div className="section-heading compact"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Continue where you left off.</h2></div></div><div className="recent-empty"><div className="recent-symbol"><BookOpenText size={19}/></div><div><b>Your recent activity will live here.</b><p>When you use a tool, it will be easy to find again.</p></div><span className="sample-tag">SAMPLE SPACE</span></div></div><div className="privacy-card"><div className="privacy-icon"><LockKeyhole size={17}/></div><div><div className="eyebrow">A PROMISE TO YOU</div><h3>Your information<br/>belongs to you.</h3><p>SHENOVA is designed around privacy, user control and responsible technology.</p><Link to="/settings">Explore privacy settings <ChevronRight size={14}/></Link></div><div className="privacy-flower" aria-hidden="true">âœ³</div></div></section>
  </div>;
}

function ReadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const input = useRef(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(nextFile) {
    if (!nextFile) return;
    const extension = nextFile.name.split('.').pop()?.toLowerCase();
    const supported = ['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'pdf'];
    if (!supported.includes(extension)) {
      setFile(null);
      setPreview('');
      setResult('');
      setMessage('Choose a PNG, JPG, BMP, TIFF, or PDF document.');
      return;
    }
    if (!nextFile.size) {
      setFile(null);
      setPreview('');
      setResult('');
      setMessage('This file is empty. Choose another document.');
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setFile(null);
      setPreview('');
      setResult('');
      setMessage('This file is larger than 20 MB. Choose a smaller document.');
      return;
    }

    setFile(nextFile);
    setResult('');
    setMessage('');
    const previewable = ['png', 'jpg', 'jpeg', 'bmp'].includes(extension);
    setPreview(previewable ? URL.createObjectURL(nextFile) : '');
  }

  async function extract() {
    if (!file) {
      setMessage('Choose an image or PDF first.');
      return;
    }
    setBusy(true);
    setMessage('Uploading and processing your document...');
    try {
      setResult(await extractText(file));
      setMessage('Text extracted successfully.');
    } catch (error) {
      setResult('');
      setMessage(error.message || 'Text extraction failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(result);
      setMessage('Text copied to the clipboard.');
    } catch {
      setMessage('Could not copy text here. Select the result and copy it manually.');
    }
  }

  function downloadText() {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file?.name.replace(/\.[^.]+$/, '') || 'extracted-text'}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function say() {
    if (!result) return;
    if (!window.speechSynthesis) {
      setMessage('Text to speech is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result);
    utterance.onend = () => { setSpeaking(false); setPaused(false); };
    utterance.onerror = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  }

  function stop() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  function clear() {
    stop();
    setFile(null);
    setPreview('');
    setResult('');
    setMessage('');
    if (input.current) input.current.value = '';
  }

  return <div className="content feature-content">
    <Topline eyebrow="READ TEXT" title={'OCR \u2013 Image to Text Extraction'} description="Bring a printed page into focus. Extract text to read, copy, or download." />
    <div className="feature-layout read-layout">
      <section className="panel upload-panel">
        <div className="panel-head">
          <div><span className="step-number">01</span><h2>Choose a document</h2></div>
          <button className="text-button" onClick={clear}>Clear <X size={14} /></button>
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/bmp,image/tiff,application/pdf,.png,.jpg,.jpeg,.bmp,.tif,.tiff,.pdf" hidden onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} />
        <div className={`drop-zone ${file ? 'has-file' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files?.[0]); }}>
          {preview ? <img className="image-preview" src={preview} alt={`Preview of ${file.name}`} /> : <>
            <div className="upload-icon"><Upload size={22} /></div>
            <b>{file ? 'Document ready for OCR' : 'Drop your document right here'}</b>
            <span>PNG, JPG, BMP, TIFF, or PDF - up to 20 MB</span>
          </>}
          {file && <div className="file-preview"><b>{file.name}</b><span>{(file.size / 1024).toFixed(0)} KB - Ready to process</span></div>}
          <button className="button button-outline" onClick={() => input.current?.click()}>{file ? 'Choose another' : 'Browse files'}</button>
        </div>
        <div className="upload-options">
          <button className="option-link" onClick={() => { input.current?.setAttribute('capture', 'environment'); input.current?.click(); }}><ScanLine size={16} /> Use your camera</button>
          <span>Files are processed by your local OCR service.</span>
        </div>
        <button className="button button-primary wide" disabled={busy || !file} onClick={extract}>
          {busy ? <><span className="spinner" /> Processing document...</> : <>Extract Text <ChevronRight size={16} /></>}
        </button>
      </section>
      <section className="panel result-panel">
        <div className="panel-head">
          <div><span className="step-number">02</span><h2>Your extracted text</h2></div>
          {result && <div className="button-row"><button className="text-button" onClick={copyText}><Copy size={14} /> Copy text</button><button className="text-button" onClick={downloadText}>Download .txt</button></div>}
        </div>
        {result ? <div className="extracted-text" aria-live="polite">{result}</div> : <div className="empty-result"><div className="result-lines"><i /><i /><i /><i /></div><span>Your extracted text will appear here.</span><small>Choose a document above to get started.</small></div>}
        {result && <div className="audio-controls"><button className="button button-dark" onClick={say}><Play size={15} fill="currentColor" /> Read aloud</button><button className="control-square" aria-label="Pause reading" onClick={() => { window.speechSynthesis?.pause(); setPaused(true); }} disabled={!speaking || paused}><Pause size={14} /></button><button className="control-square" aria-label="Resume reading" onClick={() => { window.speechSynthesis?.resume(); setPaused(false); }} disabled={!paused}><Play size={13} fill="currentColor" /></button><button className="control-square" aria-label="Stop reading" onClick={stop} disabled={!speaking}><Square size={13} fill="currentColor" /></button></div>}
        {message && <p className="status-message" role="status" aria-live="polite">{message}</p>}
      </section>
    </div>
    <p className="integration-note"><ShieldCheck size={15} /> Documents are processed by your local FastAPI service and are not saved to application storage.</p>
  </div>;
}
function ListenPage(){const [recording,setRecording]=useState(false),[text,setText]=useState(''),[message,setMessage]=useState(''),[supported,setSupported]=useState(true);const ref=useRef(null);useEffect(()=>()=>{try{ref.current?.stop()}catch{}},[]);function start(){const API=window.SpeechRecognition||window.webkitSpeechRecognition;if(!API){setSupported(false);setMessage('Speech recognition is not available in this browser. Try a recent version of Chrome.');return;}try{const rec=new API();ref.current=rec;rec.continuous=true;rec.interimResults=true;rec.lang=navigator.language||'en-US';rec.onresult=e=>{let interim='',final='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript+' ';else interim+=e.results[i][0].transcript;}setText(prev=>prev+final+(interim?' '+interim:''));};rec.onerror=e=>setMessage(e.error==='not-allowed'?'Microphone access was declined. Allow it in your browser settings to begin.':`Recording stopped: ${e.error}.`);rec.onend=()=>setRecording(false);rec.start();setRecording(true);setMessage('Your microphone is on. Speak naturally.');}catch{setMessage('Could not start recording. Check your microphone permissions.');setRecording(false);}}function stop(){try{ref.current?.stop()}catch{}setRecording(false);}return <div className="content feature-content"><Topline eyebrow="SPEECH TO TEXT" title="Every voice deserves to be understood." description="Speak freely. Your words appear here as readable text."/><div className="listen-layout"><section className="panel mic-panel"><div className="record-orbit"><div className={`orbit-ring ${recording?'is-recording':''}`}/><div className={`mic-button ${recording?'recording':''}`}><Mic size={31} strokeWidth={1.5}/></div><span className={`record-dot ${recording?'live':''}`}/></div><h2>{recording?'Listening to youâ€¦':'Ready when you are.'}</h2><p>{recording?'Your voice is being transcribed in your browser.':'Select start when youâ€™re ready to speak.'}</p><div className={`waveform ${recording?'wave-active':''}`} aria-hidden="true">{Array.from({length:35},(_,i)=><i key={i} style={{'--h':`${8+(i*13%23)}px`}}/>)}</div><button className={`button ${recording?'button-stop':'button-primary'}`} onClick={recording?stop:start}>{recording?<><Square size={14} fill="currentColor"/> Stop recording</>:<><Mic size={16}/> Start recording</>}</button>{message&&<p className="status-message" role="status">{message}</p>}<div className="permission-note"><LockKeyhole size={14}/> Your browser will ask for microphone access.</div></section><section className="panel transcript-panel"><div className="panel-head"><div><span className="step-number">LIVE NOTES</span><h2>Your transcription</h2></div><div className="button-row">{text&&<><button className="text-button" onClick={()=>navigator.clipboard?.writeText(text).then(()=>setMessage('Transcription copied.'))}><Copy size={14}/> Copy</button><button className="text-button" onClick={()=>setText('')}>Clear <X size={14}/></button></>}</div></div><div className={`transcript-area ${text?'has-text':''}`} aria-live="polite">{text||<span className="placeholder-text">What you say will appear here, ready to read and revisit.</span>}</div><div className="transcript-foot"><span>{text.trim()?text.trim().split(/\s+/).length:0} words</span><span>{recording?<><i className="live-small"/> RECORDING</>:'PRIVATE SESSION'}</span></div></section></div><div className="integration-note"><ShieldCheck size={15}/> Speech recognition runs through your browser. Availability and language support vary.</div>{!supported&&<div className="support-tip">You can still use Speak Text to listen to written content.</div>}</div>}

function SpeakPage(){const [text,setText]=useState(''),[language,setLanguage]=useState('en-US'),[voice,setVoice]=useState(''),[rate,setRate]=useState(1),[playing,setPlaying]=useState(false),[message,setMessage]=useState('');const [voices,setVoices]=useState([]);useEffect(()=>{if(!window.speechSynthesis)return;const load=()=>setVoices(window.speechSynthesis.getVoices());load();window.speechSynthesis.onvoiceschanged=load;return()=>{window.speechSynthesis.onvoiceschanged=null;window.speechSynthesis.cancel();};},[]);const matching=voices.filter(v=>v.lang===language||v.lang.startsWith(language.split('-')[0]));function speak(){if(!text.trim()){setMessage('Write a little something first.');return;}if(!window.speechSynthesis){setMessage('Text to speech is not supported in this browser.');return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=language;u.rate=rate;if(voice)u.voice=voices.find(v=>v.name===voice)||null;u.onend=()=>setPlaying(false);u.onerror=()=>setPlaying(false);window.speechSynthesis.speak(u);setPlaying(true);setMessage('Your words are being spoken aloud.');}function pause(){if(playing){window.speechSynthesis.pause();setPlaying(false);}else if(window.speechSynthesis.paused){window.speechSynthesis.resume();setPlaying(true);}}function stop(){window.speechSynthesis?.cancel();setPlaying(false);}return <div className="content feature-content"><Topline eyebrow="SPEAK TEXT" title="Give your words a voice." description="Type what you want to say, then listen at a pace that feels comfortable."/><div className="speak-layout"><section className="panel compose-panel"><div className="panel-head"><div><span className="step-number">YOUR MESSAGE</span><h2>What would you like to say?</h2></div><button className="text-button" onClick={()=>{setText('');setMessage('');stop();}}>Clear <X size={14}/></button></div><label className="sr-only" htmlFor="speak-text">Type the text to speak</label><textarea id="speak-text" className="main-textarea" maxLength={5000} placeholder="Your words go hereâ€¦" value={text} onChange={e=>setText(e.target.value)}/><div className="textarea-foot"><span>Take your time. Thereâ€™s no rush.</span><span>{text.length} / 5,000</span></div><div className="voice-settings"><div className="field"><label htmlFor="language">Language</label><div className="select-wrap"><Languages size={15}/><select id="language" value={language} onChange={e=>setLanguage(e.target.value)}><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option><option value="en-IN">English (India)</option><option value="hi-IN">à¤¹à¤¿à¤¨à¥à¤¦à¥€</option><option value="es-ES">EspaÃ±ol</option><option value="fr-FR">FranÃ§ais</option></select></div></div><div className="field"><label htmlFor="voice">Voice <span>(from your device)</span></label><div className="select-wrap"><Volume2 size={15}/><select id="voice" value={voice} onChange={e=>setVoice(e.target.value)}><option value="">Default voice</option>{matching.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select></div></div></div></section><section className="listen-card"><div className="eyebrow">A MOMENT FOR YOUR WORDS</div><div className="listen-disc"><div className={`disc-wave ${playing?'disc-active':''}`}>{Array.from({length:17},(_,i)=><i key={i} style={{'--h':`${12+((i*19)%36)}px`}}/>)}</div></div><div className="speed-row"><span>Slower</span><label htmlFor="speed" className="sr-only">Speech speed</label><input id="speed" type="range" min="0.65" max="1.35" step="0.1" value={rate} onChange={e=>setRate(Number(e.target.value))}/><span>Faster</span></div><div className="speed-value">{rate.toFixed(1)}Ã— speed</div><button className="button button-light" onClick={speak}>{playing?<><Play size={15} fill="currentColor"/> Restart speaking</>:<><Volume2 size={16}/> Speak my words</>}</button><div className="playback-row"><button className="playback-control" onClick={pause} aria-label={playing?'Pause':'Resume'} disabled={!text}><Pause size={16}/><span>{playing?'Pause':'Resume'}</span></button><span className="playback-separator"/><button className="playback-control" onClick={stop} aria-label="Stop" disabled={!text}><Square size={13} fill="currentColor"/><span>Stop</span></button></div><div className="listen-caption">Listen at your own pace.</div></section></div>{message&&<div className="status-message speak-status" role="status">{message}</div>}<p className="integration-note"><ShieldCheck size={15}/> Voice playback uses speech voices available on your device.</p></div>}

function SimplifyPage(){const [text,setText]=useState(''),[result,setResult]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');async function simplify(){if(!text.trim()){setMessage('Paste some information to get started.');return;}setBusy(true);setMessage('');try{setResult(await explainText(text));}catch(e){setMessage(e.message);}finally{setBusy(false);}}return <div className="content feature-content"><Topline eyebrow="SIMPLIFY INFORMATION" title="Clarity begins here." description="Bring a tricky paragraph. Leave with a clearer understanding."/><div className="simplify-layout"><section className="panel simplify-input"><div className="panel-head"><div><span className="step-number">01</span><h2>What would you like help with?</h2></div><button className="text-button" onClick={()=>{setText('');setResult('');setMessage('');}}>Clear <X size={14}/></button></div><label className="sr-only" htmlFor="original">Paste the information you'd like simplified</label><textarea id="original" className="main-textarea simplify-textarea" placeholder="Paste a letter, instructions, or anything you'd like to understand more easilyâ€¦" value={text} onChange={e=>setText(e.target.value)}/><div className="textarea-foot"><span>Long or short, itâ€™s up to you.</span><span>{text.length} characters</span></div><button className="button button-primary" onClick={simplify} disabled={busy}>{busy?<><span className="spinner"/> Preparingâ€¦</>:<>Explain in simple language <ChevronRight size={16}/></>}</button>{message&&<p className="status-message" role="status">{message}</p>}<div className="example-box"><span className="example-label"><Sparkles size={13}/> EXAMPLE TO TRY</span><p>â€œThe library will be closed on public holidays and the first Monday of each month.â€</p><button onClick={()=>{setText('The library will be closed on public holidays and the first Monday of each month.');setMessage('Example added.');}}>Use this example <ChevronRight size={13}/></button></div></section><section className="simplify-output"><div className="output-head"><div><span className="step-number">02</span><h2>A clearer version</h2></div>{result&&<button className="text-button" onClick={()=>navigator.clipboard?.writeText(result).then(()=>setMessage('Simplified text copied.'))}><Copy size={14}/> Copy</button>}</div>{result?<div className="output-result">{result}</div>:<div className="output-empty"><div className="clarity-mark"><span/><span/><span/></div><h3>Understanding,<br/>made a little easier.</h3><p>Your simplified explanation will appear here.</p></div>}<div className="output-note"><ShieldCheck size={14}/> A helper for understanding, not a substitute for professional advice.</div></section></div><div className="integration-note"><Sparkles size={15}/> Simplification is not connected to an AI service yet. No result will be generated until one is configured.</div></div>}

function SettingsPage({prefs,setPrefs}){function toggle(k){setPrefs(p=>({...p,[k]:!p[k]}));}return <div className="content feature-content"><Topline eyebrow="SETTINGS & PREFERENCES" title="Make this space yours." description="Small changes can make a big difference. Choose what feels comfortable."/><div className="settings-layout"><section className="panel settings-panel"><div className="settings-intro"><div className="settings-icon"><SettingsIcon size={19}/></div><div><h2>Accessibility preferences</h2><p>These settings stay on this device and apply throughout SHENOVA.</p></div></div><div className="setting-row"><div><h3>Text size</h3><p>Choose a comfortable reading size.</p></div><div className="segmented" role="group" aria-label="Text size">{[['regular','Regular'],['large','Large'],['larger','Larger']].map(([v,label])=><button key={v} className={prefs.size===v?'selected':''} aria-pressed={prefs.size===v} onClick={()=>setPrefs({...prefs,size:v})}>{label}</button>)}</div></div><div className="setting-row"><div><h3>High contrast</h3><p>Make text and controls stand out more.</p></div><Toggle checked={prefs.contrast} onChange={()=>toggle('contrast')} label="High contrast"/></div><div className="setting-row"><div><h3>Reduce motion</h3><p>Keep movement and animation to a minimum.</p></div><Toggle checked={prefs.motion} onChange={()=>toggle('motion')} label="Reduce motion"/></div></section><section className="settings-privacy"><div className="privacy-icon"><LockKeyhole size={17}/></div><div className="eyebrow">YOUR CONTROL MATTERS</div><h2>Your privacy,<br/>on your terms.</h2><p>Accessibility preferences are saved locally in this browser. Your recent activity is not tracked or sent anywhere.</p><div className="privacy-status"><Check size={15}/> Preferences stored on this device</div></section></div><div className="integration-note"><ShieldCheck size={15}/> Your preferences are saved automatically in this browser.</div></div>}
function Toggle({checked,onChange,label}){return <button className={`toggle ${checked?'on':''}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span/></button>}

export default App;

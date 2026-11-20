import React, {useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Check, ChevronDown, Search} from 'lucide-react';
import './FilterMenu.css';

export default function FilterMenu({children, value, onChange, disabled, className='', ...props}) {
  const options = React.Children.toArray(children).filter(React.isValidElement).map(({props:option})=>{
    const label = React.Children.toArray(option.children).join('');
    return {label, group:option['data-group'], shortLabel:option['data-short-label'], value:String(option.value ?? label)};
  });
  const selected = options.findIndex(option=>option.value===String(value));
  const [open,setOpen] = useState(false), [query,setQuery] = useState('');
  const [active,setActive] = useState(0);
  const [position,setPosition] = useState(null);
  const button = useRef(null), popup = useRef(null), menu = useRef(null), searchInput = useRef(null), search = useRef({text:'',time:0});
  const id = useId();
  const keyNav = useRef(false);
  // Phones get a bottom sheet: no keyboard until you tap search, and the list scrolls freely.
  const [sheet,setSheet] = useState(false);
  const searchable=options.length>8;
  const visibleOptions=useMemo(()=>options.map((option,index)=>({...option,index})).filter(option=>!query||[option.group,option.label].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase().trim())),[options,query]);
  const menuTitle=props['aria-label'] || button.current?.closest('label')?.childNodes[0]?.textContent?.trim() || 'Choose An Option';

  function show() {
    setSheet(typeof window!=='undefined'&&(window.matchMedia?.('(pointer:coarse)').matches||window.innerWidth<=650));
    keyNav.current=false;setQuery('');setActive(Math.max(0,selected));setOpen(true);
  }
  function choose(index) {
    if (!visibleOptions[index]) return;
    onChange({target:{value:visibleOptions[index].value}});
    setOpen(false);
    setQuery('');
    button.current?.focus({preventScroll:true});
  }
  useLayoutEffect(()=>{
    if (!open) return;
    function place() {
      if (sheet) {
        // Sit on top of the on-screen keyboard when it is open.
        const view = window.visualViewport;
        const height = view ? view.height : window.innerHeight;
        const lift = view ? Math.max(0, window.innerHeight - view.height - view.offsetTop) : 0;
        setPosition({left:0,right:0,bottom:lift,width:'100%',maxHeight:Math.round(height*(lift?.92:.72))});
        return;
      }
      const box = button.current.getBoundingClientRect();
      const width = Math.min(Math.max(box.width,220),window.innerWidth-24);
      const below = window.innerHeight-box.bottom-16, above = box.top-16;
      const desired=Math.min(options.length*44+(searchable?88:54),320);
      const flip = below<desired && above>below;
      const left = Math.max(12,Math.min(box.left+(box.width-width)/2,window.innerWidth-width-12));
      setPosition({width,left,maxHeight:Math.min(360,Math.max(112,flip?above:below)),
        ...(flip?{bottom:window.innerHeight-box.top+5}:{top:box.bottom+5})});
    }
    place();
    function outside(e) {
      if(!button.current?.contains(e.target) && !popup.current?.contains(e.target))setOpen(false);
    }
    // Scrolling the list itself must not move the menu.
    function pageScroll(e) {if(!sheet&&!popup.current?.contains(e.target))place();}
    const view = window.visualViewport;
    window.addEventListener('resize',place);
    window.addEventListener('scroll',pageScroll,true);
    view?.addEventListener('resize',place);
    document.addEventListener('pointerdown',outside);
    const overflow=document.body.style.overflow;
    if(sheet)document.body.style.overflow='hidden';
    return ()=>{
      window.removeEventListener('resize',place);
      window.removeEventListener('scroll',pageScroll,true);
      view?.removeEventListener('resize',place);
      document.removeEventListener('pointerdown',outside);
      document.body.style.overflow=overflow;
    };
  },[open,options.length,searchable,sheet]);
  useEffect(()=>{if(open&&searchable&&!sheet)searchInput.current?.focus({preventScroll:true});},[open,searchable,sheet]);
  // When the menu opens, show the current choice in the middle of the list.
  useLayoutEffect(()=>{
    if(!open||!position)return;
    const list=menu.current,item=list?.querySelector('[aria-selected=true]');
    if(item)list.scrollTop=item.offsetTop-(list.clientHeight-item.offsetHeight)/2;
  },[open,Boolean(position)]);
  useEffect(()=>{
    // Only follow the highlighted option when it moved by keyboard, never while a finger scrolls.
    if(open && position && keyNav.current) {
      const list=menu.current, item=list?.children[active];
      if(!item)return;
      if(item.offsetTop<list.scrollTop)list.scrollTop=item.offsetTop;
      else if(item.offsetTop+item.offsetHeight>list.scrollTop+list.clientHeight)
        list.scrollTop=item.offsetTop+item.offsetHeight-list.clientHeight;
    }
  },[open,active,Boolean(position),id,visibleOptions.length]);
  function keyDown(e) {
    if(e.key==='Tab'){setOpen(false);return;}
    if(e.key==='Escape'){setOpen(false);setQuery('');button.current?.focus({preventScroll:true});e.preventDefault();return;}
    if(e.currentTarget===searchInput.current&&!['Enter','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    if(['Enter',' '].includes(e.key)){e.preventDefault();open?choose(active):show();return;}
    if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){
      e.preventDefault();
      if(!open){show();return;}
      if(!visibleOptions.length)return;
      keyNav.current=true;
      setActive(i=>e.key==='Home'?0:e.key==='End'?visibleOptions.length-1:Math.max(0,Math.min(visibleOptions.length-1,i+(e.key==='ArrowUp'?-1:1))));
      return;
    }
    if(e.key.length===1 && !e.ctrlKey && !e.metaKey && !e.altKey){
      const now=Date.now();
      const text=(now-search.current.time<750?search.current.text:'')+e.key.toLowerCase();
      search.current={text,time:now};
      const index=visibleOptions.findIndex(o=>o.label.toLowerCase().startsWith(text));
      if(index>=0){setActive(index);setOpen(true);}
    }
  }
  const expanded=open && !disabled && options.length>0;
  return <>
    <button {...props} ref={button} className={'filter-trigger '+className} type="button" role="combobox"
      disabled={disabled || !options.length} aria-haspopup="listbox" aria-expanded={Boolean(expanded)}
      aria-controls={expanded?id:undefined} aria-activedescendant={expanded&&visibleOptions.length?id+'-'+active:undefined}
      onClick={()=>open?setOpen(false):show()} onKeyDown={keyDown}>
      <span>{options[selected]?.shortLabel || options[selected]?.label || options[0]?.label || '—'}</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    {expanded && position && createPortal(<>
      {sheet&&<div className="filter-sheet-backdrop" aria-hidden="true"/>}
      <div ref={popup} className={'filter-popup'+(sheet?' is-sheet':'')} style={position}>
      {sheet&&<span className="filter-sheet-grip" aria-hidden="true"/>}
      <div className="filter-popup-heading"><b>{menuTitle}</b>{sheet?<button type="button" className="filter-sheet-done" onClick={()=>setOpen(false)}>Done</button>:<small>{visibleOptions.length} of {options.length} options</small>}</div>
      {searchable&&<label className="filter-popup-search"><Search size={16} aria-hidden="true"/><input ref={searchInput} type="search" role="searchbox" aria-label={'Search '+menuTitle} placeholder={'Search '+menuTitle.toLowerCase()+'…'} value={query} onChange={event=>{setQuery(event.target.value);setActive(0)}} onKeyDown={keyDown}/></label>}
      <div ref={menu} className="filter-popup-options" role="listbox" id={id} aria-label={menuTitle}>
        {visibleOptions.length?visibleOptions.map((option,i)=><div role="option" aria-selected={selected===option.index} id={id+'-'+i} key={option.value}
          className={'filter-option'+(active===i?' active':'')} onPointerMove={e=>{if(e.pointerType==='mouse'){keyNav.current=false;setActive(i);}}} onMouseDown={e=>e.preventDefault()}
          onClick={e=>{e.preventDefault();e.stopPropagation();choose(i);}}>
          <span>{option.group&&option.group!==visibleOptions[i-1]?.group&&<small className="filter-option-day">{option.group}</small>}{option.label}</span>{selected===option.index && <Check size={16} aria-hidden="true"/>}
        </div>):<div className="filter-empty">No matching options.</div>}
      </div>
    </div></>,button.current.closest('.app') || document.body)}
  </>;
}

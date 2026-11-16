import math
"""Draws the league backdrops in public/preview/assets (run from the repo root)."""
W,H=2400,1500
def page(body,c1,c2,c3,glow):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice"><defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset=".55" stop-color="{c2}"/><stop offset="1" stop-color="{c3}"/></linearGradient>
<radialGradient id="hot" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="{glow}" stop-opacity=".75"/><stop offset=".55" stop-color="{glow}" stop-opacity=".18"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient>
<pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><circle cx="17" cy="17" r="6" fill="#fff"/></pattern>
<linearGradient id="dotfade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>
<mask id="dotmask"><rect width="{W}" height="{H}" fill="url(#dotfade)"/></mask>
<linearGradient id="floorfade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05030a" stop-opacity=".8"/></linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<g opacity=".16" mask="url(#dotmask)"><rect width="{W}" height="{H}" fill="url(#dots)"/></g>
<g opacity=".07" fill="#fff" transform="rotate(-18 {W/2} {H/2})">{''.join(f'<rect x="-600" y="{y}" width="3800" height="{h}"/>' for y,h in ((120,90),(330,26),(980,150),(1230,34),(1390,14)))}</g>
<rect width="{W}" height="{H}" fill="url(#hot)"/>
{body}
<rect width="{W}" height="{H}" fill="url(#floorfade)"/></svg>
'''
def both(path_d,stroke,width,extra=''):
    # glow copy + crisp copy
    return f'<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="{stroke}" stroke-width="{width*2.2}" opacity=".45" filter="url(#glow)">{path_d}</g><g stroke="#fff" stroke-width="{width}"{extra}>{path_d}</g></g>'
def yardlines(cx,top,color):
    out=''
    for i in range(1,9):
        t=(i/8)**1.8;y=top+(H-top)*t;half=260+1500*t
        out+=f'<line x1="{cx-half:.0f}" y1="{y:.0f}" x2="{cx+half:.0f}" y2="{y:.0f}" stroke="{color}" stroke-width="{3+9*t:.1f}" opacity="{.18+.3*t:.2f}"/>'
    out+=f'<line x1="{cx-260}" y1="{top}" x2="{cx-1760}" y2="{H}" stroke="{color}" stroke-width="8" opacity=".3"/><line x1="{cx+260}" y1="{top}" x2="{cx+1760}" y2="{H}" stroke="{color}" stroke-width="8" opacity=".3"/>'
    return out
def football(cx,cy,rx,rot,fill1,fill2,stripes=False):
    ry=rx*.6
    shape=f'M{cx-rx},{cy} Q{cx},{cy-ry*2} {cx+rx},{cy} Q{cx},{cy+ry*2} {cx-rx},{cy}Z'
    g=f'<g transform="rotate({rot} {cx} {cy})"><path d="{shape}" fill="{fill2}" opacity=".5" filter="url(#glow)" transform="translate(0 30)"/>'
    g+=f'<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{fill1}"/><stop offset="1" stop-color="{fill2}"/></linearGradient><path d="{shape}" fill="url(#fb)" stroke="#fff" stroke-width="10"/>'
    g+=f'<path d="M{cx-rx*.93},{cy-ry*.12} Q{cx},{cy-ry*1.72} {cx+rx*.93},{cy-ry*.12}" fill="none" stroke="#fff" stroke-width="6" opacity=".35"/>'
    if stripes:
        g+=f'<clipPath id="fbclip"><path d="{shape}"/></clipPath><g clip-path="url(#fbclip)">'
        for sx in(-.6,.6):g+=f'<path d="M{cx+rx*sx:.0f},{cy-ry*1.2:.0f} Q{cx+rx*sx*1.1:.0f},{cy} {cx+rx*sx:.0f},{cy+ry*1.2:.0f}" stroke="#fff" stroke-width="{rx*.09:.0f}" fill="none"/>'
        g+='</g>'
    g+=f'<line x1="{cx-rx*.34}" y1="{cy-ry*.62}" x2="{cx+rx*.34}" y2="{cy-ry*.62}" stroke="#fff" stroke-width="{rx*.05:.0f}" stroke-linecap="round"/>'
    for i in range(6):
        x=cx-rx*.27+i*rx*.108;g+=f'<line x1="{x:.0f}" y1="{cy-ry*.76:.0f}" x2="{x:.0f}" y2="{cy-ry*.48:.0f}" stroke="#fff" stroke-width="{rx*.04:.0f}" stroke-linecap="round"/>'
    return g+'</g>'
def speed(cx,cy,rot,n=6):
    return f'<g transform="rotate({rot} {cx} {cy})" fill="#fff">'+''.join(f'<rect x="{cx-1500-i*90}" y="{cy-170+i*68}" width="{900+i*60}" height="{16-i*2}" rx="8" opacity="{.5-i*.07:.2f}"/>' for i in range(n))+'</g>'
def basketball(cx,cy,r,c1,c2):
    return (f'<circle cx="{cx}" cy="{cy+24}" r="{r}" fill="{c2}" opacity=".55" filter="url(#glow)"/><radialGradient id="bk" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#bk)" stroke="#fff" stroke-width="10"/>'
            f'<g stroke="#fff" stroke-width="{r*.05:.0f}" fill="none" stroke-linecap="round" opacity=".95"><path d="M{cx-r},{cy} H{cx+r}"/><path d="M{cx},{cy-r} V{cy+r}"/><path d="M{cx-r*.72},{cy-r*.69} Q{cx-r*.12},{cy} {cx-r*.72},{cy+r*.69}"/><path d="M{cx+r*.72},{cy-r*.69} Q{cx+r*.12},{cy} {cx+r*.72},{cy+r*.69}"/></g>')
def hoop(cx,cy,w,rim):
    rx=w/2;ry=w*.17;net=''
    for i in range(11):
        t=i/10;x0=cx-rx+2*rx*t;x1=cx-rx*.5+rx*t
        net+=f'<line x1="{x0:.0f}" y1="{cy}" x2="{x1:.0f}" y2="{cy+w*.7:.0f}"/>'
    for k in range(1,6):
        t=k/5.5;net+=f'<ellipse cx="{cx}" cy="{cy+w*.7*t:.0f}" rx="{rx*(1-.5*t):.0f}" ry="{ry*(1-.35*t):.0f}"/>'
    return (f'<g fill="none" stroke="#fff" stroke-width="6" opacity=".85">{net}</g><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="{rim}" stroke-width="{w*.1:.0f}" opacity=".5" filter="url(#glow)"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="{rim}" stroke-width="{w*.05:.0f}"/><ellipse cx="{cx}" cy="{cy-4}" rx="{rx}" ry="{ry}" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>')
def court_arcs(cx,top,color):
    return (f'<g fill="none" stroke="{color}" stroke-width="12" opacity=".34"><ellipse cx="{cx}" cy="{H+40}" rx="1500" ry="520"/><ellipse cx="{cx}" cy="{H+40}" rx="620" ry="215"/><line x1="{cx-620}" y1="{H+40}" x2="{cx-420}" y2="{top}"/><line x1="{cx+620}" y1="{H+40}" x2="{cx+420}" y2="{top}"/><line x1="{cx-420}" y1="{top}" x2="{cx+420}" y2="{top}"/></g>')
def goalpost(cx,base,h,color):
    w=h*.6;d=f'<path d="M{cx},{base} V{base-h*.42} M{cx-w/2},{base-h*.42} H{cx+w/2} M{cx-w/2},{base-h*.42} V{base-h} M{cx+w/2},{base-h*.42} V{base-h}"/>'
    return f'<g fill="none" stroke-linecap="round"><g stroke="{color}" stroke-width="54" opacity=".5" filter="url(#glow)">{d}</g><g stroke="{color}" stroke-width="24">{d}</g></g>'
art={
 'nfl':page(yardlines(1200,760,'#fff')+goalpost(1200,1040,820,'#ffd34d')+speed(1260,520,-24)+football(1260,520,330,-24,'#c0703e','#5a2412'),'#07051a','#2b1a78','#5a2bd0','#8f6bff'),
 'cfb':page(yardlines(1200,760,'#fff')+goalpost(1200,1060,860,'#ffe9a8')+football(1210,600,300,-62,'#c0703e','#5a2412',True),'#06140c','#0f4a2a','#c9972a','#ffd76a'),
 'cbb':page(court_arcs(1200,900,'#fff')+hoop(1200,760,520,'#ff5a2a')+basketball(1320,430,250,'#ffa24d','#b8440f'),'#12041f','#5a1a8a','#c93bb0','#ff7ad9'),
 'nba':page(court_arcs(1200,900,'#fff')+hoop(1200,900,560,'#ff5a2a')+basketball(1200,520,300,'#ffa24d','#b8440f'),'#030817','#0c2a6e','#e05a1f','#5aa2ff'),
}
for n,s in art.items():open(f'public/preview/assets/{n}-scene.svg','w').write(s)

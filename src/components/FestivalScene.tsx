import NinjaIcon from "./NinjaIcon";
import { ninjaFor } from "@/lib/ninjas";

/** Floating training islands, built from the game's own vector art. */
export default function FestivalScene() {
  return <svg viewBox="0 0 560 460" className="festival-scene" aria-hidden="true" focusable="false">
    <circle cx="322" cy="201" r="166" fill="#eee0ff"/>
    <circle cx="342" cy="166" r="108" fill="#ffdc98"/>
    <g fill="#fff" opacity=".9"><path d="M76 111a21 21 0 0 1 37-14 28 28 0 0 1 53 8 20 20 0 0 1 27 21H65a17 17 0 0 1 11-15Z"/><path d="M404 95a17 17 0 0 1 31-12 24 24 0 0 1 45 7 17 17 0 0 1 23 18H394a14 14 0 0 1 10-13Z"/></g>
    <path d="M86 349q53-38 99 0l-29 29-39-5Z" fill="#6db9ac"/><ellipse cx="138" cy="347" rx="52" ry="15" fill="#abebc8"/>
    <path d="M386 323q60-35 113 0l-31 37-44-7Z" fill="#ba83c4"/><ellipse cx="442" cy="320" rx="57" ry="17" fill="#ebc2f3"/>
    <path d="M200 335q112-28 208 0l-42 71-94 22-59-41Z" fill="#8274bd"/>
    <path d="m218 361 39 8 16 43-36-20m126-27-18 38 22-5 23-37" fill="#a08ed0"/>
    <ellipse cx="304" cy="332" rx="105" ry="29" fill="#65b8a4"/>
    <ellipse cx="304" cy="322" rx="105" ry="27" fill="#b3efbd"/>
    <path d="M242 311q66-21 127 4" fill="none" stroke="#eaffdd" strokeWidth="5" strokeLinecap="round"/>
    <g className="festival-lead"><svg x="190" y="94" width="224" height="234" viewBox="0 0 100 100"><NinjaIcon style={ninjaFor(2048)}/></svg></g>
    <svg x="87" y="258" width="96" height="94" viewBox="0 0 100 100"><NinjaIcon style={ninjaFor(8)}/></svg>
    <svg x="399" y="237" width="95" height="93" viewBox="0 0 100 100"><NinjaIcon style={ninjaFor(16)}/></svg>
    <g className="festival-stars" fill="#ffb641" stroke="#fff0bb" strokeWidth="2"><path d="m138 162 7 16 18 2-13 12 4 18-16-9-15 9 3-18-13-12 18-2Z"/><path d="m435 171 5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1Z"/><path d="m339 57 4 9 10 1-8 7 3 10-9-5-9 5 2-10-7-7 10-1Z"/></g>
    <g fill="#ed8db6"><circle cx="196" cy="214" r="6"/><circle cx="410" cy="405" r="5"/><path d="m84 214 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z"/></g>
    <g fill="#8d79cd"><circle cx="436" cy="132" r="5"/><circle cx="182" cy="397" r="4"/><path d="m463 385 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z"/></g>
  </svg>;
}

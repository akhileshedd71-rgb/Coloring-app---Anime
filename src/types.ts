export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ColoringMode = 'free' | 'number' | 'shade';
export type Tool = 'fill' | 'brush' | 'airbrush' | 'pencil' | 'gradient' | 'sparkle' | 'eraser' | 'eyedropper';
export interface ArtRegion { id:string; d:string; color:string; name:string; number:number; label:[number,number]; strokeWidth?:number; }
export interface ArtLine { d:string; width?:number; color?:string; opacity?:number; }
export interface ArtShade { d:string; opacity:number; color?:string; }
export interface ArtPage { id:string; title:string; category:string; difficulty:Difficulty; tags:string[]; width:number; height:number; palette:string[]; regions:ArtRegion[]; lines:ArtLine[]; shades:ArtShade[]; ink?:{d:string;color:string}[]; transparent:boolean; description:string; }
export interface ArtMeta { id:string; title:string; category:string; difficulty:Difficulty; tags:string[]; palette:string[]; regionCount:number; thumbnail:string; reference:string; file:string; transparent:boolean; description:string; }
export interface Fill { color:string; secondary?:string; angle?:number; }
export interface Point { x:number; y:number; pressure:number; }
export interface BrushStroke { id:string; tool:Tool; color:string; size:number; opacity:number; points:Point[]; regionId?:string; }
export interface ColoringState { fills:Record<string,Fill>; strokes:BrushStroke[]; shading:boolean; }
export interface Project { id:string; artId:string; name:string; createdAt:number; updatedAt:number; mode:ColoringMode; state:ColoringState; thumbnail?:Blob; progress:number; }

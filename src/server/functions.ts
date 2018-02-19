import * as _ from 'underscore';
// FUNCTIONS

export function minuteToDecimal(pos:any, pos_i:any){
	if(!pos_i)
		pos_i = "N";
	
	let dg = (pos/100);
	let minutes = pos - (dg * 100);
	let res = (minutes / 60) + dg;
	return (pos_i.toUpperCase() == "S" || pos_i.toUpperCase() == "W")? res * -1 : res;
}
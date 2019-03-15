import { RemoteFileResInfo, FileDict } from "./RemoteFileServer";
import FormData from "form-data";
import * as fs from "fs";
import { IncomingMessage } from "http";
import * as dbuf from 'dbuf';

export interface RemoteFile{
    err?:string;
    files?: {[name:string]:Buffer},
    params?:any,
}


export class RemoteFileClient{
    private url:string;
    constructor(url:string){
        this.url = `${url}/r`;
    }
    private async recieveData(res:IncomingMessage){
        return new Promise<Buffer>((resolve,reject)=>{
            let chunks:any[] = [];
            let size = 0;
            res.on('data', (chunk) => { 
                chunks.push(chunk);  
                size += chunk.length;
            });
            res.on("error",reject);
            res.on('end', () => {
                let data:Buffer;  
                switch(chunks.length) {  
                case 0: data = new Buffer(0);  
                    break;  
                case 1: data = chunks[0];  
                    break;  
                default:  
                    data = new Buffer(size);  
                    for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {  
                        let chunk = chunks[i];  
                        chunk.copy(data, pos);  
                        pos += chunk.length;  
                    }  
                    break; 
                } 
                resolve(data);
            });
        });
    }
    private async extractData(res:IncomingMessage):Promise<RemoteFile>{
            let data = await this.recieveData(res);
            let rb = new dbuf.DReadBuf(data);
            let err = rb.readString();
            let params = rb.readJSON();

            let num = rb.readInt32();
            let files:{[name:string]:Buffer} = {};
            for(let i=0;i<num;++i){
                let name = rb.readString();
                let buf = rb.readBuffer();
                files[name] = buf;
            }

            return {
                err,params,files
            }
    }
    async process(files:FileDict,params?:any):Promise<RemoteFile>{
        return new Promise<RemoteFile>((resolve,reject)=>{
            let form = new FormData();
            if(params){
                form.append("params",JSON.stringify(params));
            }

            
            for(let fieldname in files){
                form.append(fieldname,fs.createReadStream(files[fieldname]));
            }
            
           
           
            form.submit(this.url, async (err, res)=>{
                if(err){
                    reject(err);
                    return;
                }
                let info = await this.extractData(res);
                res.resume();
                resolve(info);
            });
        });
        
    }
}
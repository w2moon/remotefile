import {expect} from "chai";
import {RemoteFileClient} from "../src/RemoteFileClient";
import {RemoteFileServer} from "../src/RemoteFileServer";

const PORT = 9999;
let server = new RemoteFileServer(PORT,async (file)=>{
    return {};
});
describe("存储测试",()=>{

    it('在temp中创建新的存储空间',()=>{
       // expect(game.getValueAutoUnit(new jsbn.BigInteger("0"))).equal("0");
       

        setTimeout(async ()=>{
            let client = new RemoteFileClient(`http://127.0.0.1:${PORT}`);
            await client.process({file:"./test/test.ts"});
        },1000);
    });
});{"i":1}
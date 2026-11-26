// Uso (na raiz do repositório): node apply-update.mjs
import fs from "node:fs";
const must=(ok,msg)=>{if(!ok){console.error("✗ "+msg);process.exit(1)}console.log("✓ "+msg)};
// 1) meta.json
const mp="assets/img/meta.json",meta=JSON.parse(fs.readFileSync(mp,"utf8"));
Object.assign(meta,JSON.parse(fs.readFileSync("meta-additions.json","utf8")));
fs.writeFileSync(mp,JSON.stringify(meta,null,1));must(true,"meta.json atualizado");
// 2) build.mjs
let s=fs.readFileSync("build.mjs","utf8");
if(s.includes("/* update-2026 */")){console.log("build.mjs já atualizado");process.exit(0)}
const sub=(re,fn,msg)=>{must(re.test(s),msg);s=s.replace(re,fn)};
const DATA_BLOCK=`/* update-2026 */
{
 const byId=(a)=>Object.fromEntries(a.map(w=>[w.id,w]));
 const W=byId(DATA.works),M=byId(DATA.more),has=(f)=>(i)=>i[0]===f;
 const front=(w,f)=>{const i=w.images.find(has(f));w.images=[i,...w.images.filter(x=>x!==i)]};
 const back=(w,f)=>{const i=w.images.find(has(f));w.images=[...w.images.filter(x=>x!==i),i]};
 front(W.luma,"trabalhos/trabalhos_06.png");
 front(W.rama,"trabalhos/trabalhos_24.png");back(W.rama,"trabalhos/trabalhos_22.jpg");
 W.c2e.images=W.c2e.images.filter(i=>i[0]!=="trabalhos/trabalhos_49.png");back(W.c2e,"trabalhos/trabalhos_47.png");
 DATA.works.push(M.cookie,M.ejep,
  {id:"tanac",title:"Tanac — UX/UI",images:[["trabalhos/tanac_1.png","Site da Tanac: página Sobre com propósito e trajetória"],["trabalhos/tanac_2.png","Site da Tanac: código de conduta, newsletter e rodapé"],["trabalhos/tanac_3.png","Site da Tanac: unidades de negócios, certificações e P&D"]]},
  {id:"ipanema",title:"Ipanema Rider — E-commerce UX/UI",images:[["trabalhos/ipanema_1.png","E-commerce da Ipanema: vitrine com sandálias e personagens"],["trabalhos/ipanema_2.png","E-commerce da Rider Kids: banner e rodapé da loja"],["trabalhos/ipanema_3.png","E-commerce da Ipanema: banner infantil e Black Friday"]]});
 DATA.more=DATA.more.filter(p=>p!==M.cookie&&p!==M.ejep);
 DATA.heroFloat=["trabalhos/trabalhos_32.png","trabalhos/trabalhos_06.png","trabalhos/trabalhos_24.png"];
 DATA.portrait={file:"home/sobre_mim.jpeg",alt:"Retrato de Guilherme Eccel"};DATA.photos=[];
 const fix=(t)=>t.replace(/águia/g,"peru").replace(/tomate/g,"caqui");
 DATA.works.forEach(w=>w.images.forEach(i=>i[1]=fix(i[1])));
 DATA.skills.forEach(k=>k.files.forEach(i=>i[1]=fix(i[1])));
}
/* --- helpers`;
sub(/\/\* -+ helpers/,()=>DATA_BLOCK,"DATA (projetos, hero, retrato)");
sub(/const fits = [^;]+;/,()=>"const fits = true;","imagens preenchem a moldura");
sub(/skill-item\$\{transparent \? " contain" : ""\}/,()=>"skill-item","itens de ferramenta sem contain");
sub(/const photos = \[DATA\.portrait, \.\.\.DATA\.photos\];/,()=>"const photos = [DATA.portrait];","uma foto só");
sub(/<figcaption aria-hidden="true" data-i18n="about\.photo">[^<]*<\/figcaption>/,()=>"","legenda da foto removida");
sub(/<div class="hero-float" aria-hidden="true">\$\{lgFloat\}<\/div>/,()=>'<div class="hero-float" aria-hidden="true"></div>',"hero-float esvaziado");
sub(/<button type="button" class="hero-mascot"[\s\S]*?<\/button>/,(m)=>'<div class="hero-stage"><div class="burst" aria-hidden="true">${lgFloat}</div>'+m+'</div>',"fotos atrás do mascote");
sub(/\s*<p data-i18n="hero\.lead"><\/p>/,()=>"","frase do hero removida");
sub(/\s*<p data-reveal data-i18n="collage\.intro"><\/p>/,()=>"","frase de colagens removida");
sub(/<link rel="stylesheet" href="css\/style\.css">/,(m)=>m+'\n<link rel="stylesheet" href="css/update.css">',"update.css");
sub(/<script src="js\/main\.js" defer><\/script>/,(m)=>m+'\n<script src="js/update.js" defer></script>',"update.js");
fs.writeFileSync("build.mjs",s);
await import("node:child_process").then(({execSync})=>execSync("node build.mjs",{stdio:"inherit"}));
console.log("Pronto. Teste localmente com: node serve.mjs");

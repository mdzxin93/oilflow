import {defineConfig} from 'vite';
export default defineConfig({root:'frontend',build:{outDir:'../dist',emptyOutDir:true},server:{host:'0.0.0.0',port:Number(process.env.PORT||5173),strictPort:true,allowedHosts:true,fs:{allow:['.']},proxy:{'/api':{target:'http://127.0.0.1:'+(process.env.API_PORT||3001),changeOrigin:true}}}});

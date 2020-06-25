from fastapi import FastAPI , File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

import subprocess
import uuid
import os
from PIL import Image
from io import BytesIO
import numpy as np

app = FastAPI()

origins = [
    "http://localhost.tiangolo.com",
    "https://localhost.tiangolo.com",
    "http://localhost",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def writeObj(verts,faces,texture_verts,fName="~/projects/depth/backend/test.obj"):
    f = open(fName,"w+")
    for vert in verts:
        x,y,z = vert
        f.write("v {} {} {}\n".format(x/1000,y/1000,z/1000))
        
    for t_vert in texture_verts:
        u,v = t_vert
        f.write("vt {} {}\n".format(u,v))
    
    for face in faces:
        a,b,c = face
        f.write("f {}/{} {}/{} {}/{}\n".format(a+1,a+1,b+1,b+1,c+1,c+1))
    f.close()


app.mount("/uploads",StaticFiles(directory="uploads"),name="uploads")

@app.post("/api/generateDepths")
def generateDepths(image: UploadFile = File(...), token: str = Form(...)):
    name = uuid.uuid4()

    direct = "uploads/{}".format(name)
    fname = direct+"/uploaded.jpg"

    os.mkdir(direct)
    f = open(fname,"wb+")
    f.write(image.file.read())
    f.close()

    img = Image.open(fname)
    h = img.height
    img = img.rotate(-90,expand=True)
    img = img.resize((h,h),Image.ANTIALIAS)
    img.save(direct+"/tex.jpg")

    proc = subprocess.Popen(["exiftool",fname],stdout=subprocess.PIPE)
    out = proc.stdout.read().decode()

    out_lines = out.split("\n")

    binary_fields = list(filter( lambda x: "Binary" in x , out_lines ))

    binary_fields = list(map( lambda x: x.split(":")[0].replace(" ","") , binary_fields ))

    valid_files = []

    for binary_tag in binary_fields:
        proc = subprocess.Popen(["exiftool","-b","-"+binary_tag,fname],stdout=subprocess.PIPE)
        out = proc.stdout.read()

        name = direct+"/"+binary_tag+".jpg"

        try:
            img = Image.open(BytesIO(out))
        except Exception as e:
            continue

        img = img.rotate(-90,expand=True)
        img.convert("RGB")
        img.save(name)

        valid_files.append(name)

    return {
        "success":True,
        "depths": valid_files
    }

@app.post("/api/generateObj")
def generateObj(link: str = Form(...),compression: int = Form(...)):

    img = Image.open(link)
    
    nH = img.height//compression
    nW = img.width//compression
    img = img.resize((nW,nH),Image.ANTIALIAS)
    

    arr = np.array(img)
    height , width = arr.shape
    points = []

    for i in range(height):
        for j in range(width):
            x = j - height/2
            y = -i + height/2
            z = -arr[i][j]
            points.append([x,y,z])


    texture_verts = []
    mesh = []

    for i in range(height):
        for j in range(width):
            tex = [
                j / width,
                1 - i / height
            ]
            texture_verts.append(tex)

    for i in range(height - 1 ):
        for j in range(width - 1):
            triangle1 = [
                i*width + j  ,
                i*width + (j + 1) ,
                (i+1)* width + j
            ]
            triangle1.reverse()
            
            triangle2 = [
                i*width + (j + 1) ,
                (i+1) * width + (j+1),
                (i+1)* width + j
            ]
            triangle2.reverse()
            
            mesh.append(triangle1)
            mesh.append(triangle2)

    direct = "/".join(link.split("/")[:2])
    fname = direct+"/"+"object.obj"
    text_fname = direct+"/"+"tex.jpg"


    writeObj(points,mesh,texture_verts,fname)

    return {
        "success": True,
        "obj": fname,
        "texture":text_fname
    }
import express from "express"
import http from "http"
import dotenv from "dotenv"
import { Server } from "socket.io"
import axios from "axios"
dotenv.config()

const app = express()
app.use(express.json())
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: process.env.NEXT_BASE_URL
    }
})
const port = process.env.PORT || 5000

app.use(express.json())

app.post("/emit", (req, res) => {
    const { socketId, eventName, payload } = req.body
    if (socketId) {
        io.to(socketId).emit(eventName, payload)
    } else {
        io.emit(eventName, payload)
    }
    res.status(200).json({ success: true })
})
io.on("connection",(socket)=>{
    socket.on("identity",async (userId)=>{
        await axios.post(`${process.env.NEXT_BASE_URL}/api/socket/connect`,{userId,socketId:socket.id})
    })
    
    // event name must match client-side emit
    socket.on("updateLocation",async ({userId,latitude,longitude})=>{
        const location = {
            type:"Point",
            coordinates:[longitude,latitude]
        }
        await axios.post(`${process.env.NEXT_BASE_URL}/api/socket/updateLocation`,{userId,location})
        io.emit("deliveryBoyLocationUpdated", {
            deliveryBoyId: userId,
            latitude,
            longitude
        })
    })
    socket.on("disconnect",()=>{
        console.log("user disconnected",socket.id)
    })
})

app.post("/notify",(req,res)=>{
    const {event, data, socketId} = req.body
    if(socketId){
        io.to(socketId).emit(event,data)
    }
    else{
        io.emit(event,data)
    }
    return res.status(200).json({"success":true})
})

server.listen(port,()=>{
    console.log(`Server is running on port ${port}`)
})

require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const PORT = process.env.PORT || 3000

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.listen(PORT, () => console.log(`server running at port ${PORT}`))
console.log(process.env.DB_HOST)
mongoose.connect(process.env.DB_HOST, { useNewUrlParser: true, useUnifiedTopology: true })

const validateToken = (req, res, next)=> {
  const token = req.headers['authorization'] && req.headers['authorization']
  if (token == null) return res.sendStatus(403)

  jwt.verify(token, process.env.TOKEN, (err, user) => {
    if (err) return res.status(401).send({ status: 401, message: "invalid token" })
    req.user = user.id
    next()
  })
}

const fourOptionQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  A: {
    type: String,
    required: true
  },
  B: {
    type: String,
    required: true
  },
  C: {
    type: String,
    required: true
  },
  D: {
    type: String,
    required: true
  }
})

const twoOptionQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  A: {
    type: String,
    required: true
  },
  B: {
    type: String,
    required: true
  }
})

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
})

const voteSchema = new mongoose.Schema({
  user : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  questionOne:{
    type: String
  },
  questionTwo:{
    type: String
  },
  questionThree:{
    type: String
  },
  questionFour:{
    type: String
  }
})

const user = mongoose.model("users", userSchema);
const vote = mongoose.model("votes", voteSchema);
const twoOptionQuestion = mongoose.model("twooptionquestions", twoOptionQuestionSchema);
const fourOptionQuestion = mongoose.model("fouroptionquestions", fourOptionQuestionSchema);

app.post('/api/add-user', async(req, res, next)=>{
  try{
    user.create(req.body)
    res.status(200).send({ status: 200, message: "user added succesfully" })
  } catch (error) {
    res.status(400).send({ status: 400, message: error.message })
  }
})

app.post('/api/login', async(req, res, next) => {
  try{
    const loginUser = await user.find(req.body)
    if (loginUser.length){
      const accessToken = jwt.sign({id:loginUser[0]._id}, process.env.TOKEN)
      res.json({ accessToken: accessToken })
      next()
    }
    else{
      res.status(200).send({ status: 200, message: "no user found" })
    }
  } catch(error){
    res.status(400).send({ status: 400, message: error.message })
  }
})

app.post ('/api/post-four-option-question', async(req, res, next)=>{
  const Question = {
    question: req.body.question,
    A: req.body.A,
    B: req.body.B,
    C: req.body.C,
    D: req.body.D
  }
  try{
    await fourOptionQuestion.create(Question)
    res.status(200).send({status: 200, message: "question added succesfully"})
  } catch(error){
    res.status(400).send({ status: 400, message: error.message})
  }
})

app.post('/api/post-two-option-question', async (req, res, next) => {
  const Question = {
    question: req.body.question,
    A: req.body.A,
    B: req.body.B
  }
  try {
    await twoOptionQuestion.create(Question)
    res.status(200).send({ status: 200, message: "question added succesfully" })
  } catch (error) {
    res.status(400).send({ status: 400, message: error.message })
  }
})

app.get('/api/get-questions', async (req, res, next) => {
  try {
    const questionFour = await fourOptionQuestion.aggregate([{ $sample: { size: 3 } }])
    const questionTwo = await twoOptionQuestion.aggregate([{ $sample: { size: 2 } }])
    const questions = questionFour.concat(questionTwo)
    res.status(200).send({ status: 200, data: questions })
    next()
  } catch (error) {
    res.status(400).send({ status: 400, message: error.message })
  }
})

app.post('/api/post-answer', validateToken, async (req, res, next)=>{
  try{
    const votingUser = await vote.find({user:req.user})
    if(votingUser.length){
      res.status(200).send({ status: 200, message: "you already voted" })
    }else{
      req.body.user = req.user
      await vote.create(req.body)
      res.status(200).send({ status: 200, message: "your vote has been recorded succesfully" })
    }
  } catch (error) {
    res.status(400).send({ status: 400, message: error.message })
  }
})

const getResult = (id)=>{
  return new Promise(async (resolve, reject) => {
    try { 
      const result = await vote.aggregate([
        {
          $group: {
            _id: "$"+id,
            count: { $sum: 1 }
          }
        }
      ])
      resolve(result)
    } catch (error) {
      reject(error);
    }
  })
}

app.get('/api/get-result', async(req, res, next)=>{
  try{
    const resultA = await getResult("questionOne")
    const resultB = await getResult("questionTwo")
    const resultC = await getResult("questionThree")
    const resultD = await getResult("questionFour")
    
    const result = {
      "Question 1" : resultA,
      "Question 2" : resultB,
      "Question 3" : resultC,
      "Question 4" : resultD
    }
    res.status(200).send({ status: 200, data: result })
  } catch (error) {
    res.status(400).send({ status: 400, message: error.message })
  }
})

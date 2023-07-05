const express = require('express')
const routes = express()
const {showUsers, userSignUp, userLogin, userListing, updateUser} = require('./controllers/users')
const validateBodyRequisition = require('./middlewares/validateBodyRequisition')
const usersSchema = require('./validations/schemas/usersSchema')
const { authentication } = require('./middlewares/authentication')

routes.get('/', (req, res)=>{
    res.send('Server up')
})

routes.get('/users', showUsers)
routes.post('/signup', validateBodyRequisition(usersSchema), userSignUp)
routes.post('/login', userLogin)

routes.use(authentication)
routes.get('/user', userListing)
routes.put('/user', updateUser)


module.exports = routes
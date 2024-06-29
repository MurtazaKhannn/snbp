const express = require('express');
const serverless = require('serverless-http');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { log } = require('console');
const port = 4000 ;






app.use(express.json());
app.use(cors());


mongoose.connect('mongodb+srv://murtazakhan1910:Murtaza0191@cluster0.97myfmh.mongodb.net/e-commerce')
    .then(() => {
        console.log('Database Connected');
    })
    .catch((err) => {
        console.log(err);
    });

// API Creation

app.get("/" , (req , res) => {
    res.send("Welcome to Silvanest");
})

// Image  Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images' ,
    filename: (req , file , cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({
    storage: storage
})

//Creating Upload Endpoint for images

app.use('/images' , express.static('upload/images'))


app.post("/upload" , upload.single('product') , (req , res) => {
    res.json({
        success: 1 ,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for creating products 

const Product = mongoose.model("Product" , {
    id : {
        type: Number ,
        required: true 
    } ,
    name : {
        type: String ,
        required: true
    } ,
    image: {
        type: String ,
        required: true
    } ,
    category: {
        type: String ,
        required: true
    } ,
    new_price:{
        type: Number ,
        required: true
    } ,
    old_price: {
        type: Number ,
        required: true
    } ,
    date: {
        type:Date ,
        default:Date.now
    } ,
    available: {
        type: String ,
        default: false
    } ,
    description: {
        type: String ,
        required: true
    }  
})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;

    // Calculate new product ID
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 1;
    }

    // Create new Product object
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
        description: req.body.description,
        available: req.body.available // Ensure availability is correctly parsed
    });
    
    try {
        // Save product to database
        await product.save();
        console.log("Product saved:", product);
        res.json({
            success: true,
            name: req.body.name
        });
    } catch (error) {
        console.error("Error saving product:", error);
        res.status(500).json({
            success: false,
            error: "Failed to save product"
        });
    }
});

//Creating API For Deleting Products

app.post('/removeproduct' , async (req ,res) => {
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success: true ,
        name : req.body.name
    })
})

// Creating API For Getting all Products

app.get('/allproducts' , async (req, res) => {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.json({
        success: true ,
        products: products
    })
})

// Schema For user Model

const Users = mongoose.model("Users" , {
    name: {
        type: String,
    } ,
    email: {
        type: String,
        unique: true
    } ,
    password: {
        type: String,
    } ,
    cartData:{
        type: Object,
    } ,
    date: {
        type:Date,
        default:Date.now
    }
})

// Creating endpoint for registering the user
app.post('/signup' , async (req , res) => {
    let check = await Users.findOne({
        email: req.body.email
    })

    if(check) {
        return res.status(400).json({success:false,error:"existing user found with same email id"});
    }

    let cart = {}
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }
        const user = new Users({
            name:req.body.username,
            email: req.body.email,
            password:  req.body.password,
            cartData: cart
        })

        await user.save();

        const data = {
            user:{
                id:user.id
            }
        }

        const token = jwt.sign(data, "secret_ecom");

        res.json({success:true , token})
    
})

// Creating endpoint for user login
app.post('/login' , async (req, res) => {
    let user = await Users.findOne({
        email: req.body.email
    })

    if(user) {
        const passCompare =  req.body.password === user.password ;
        if(passCompare) {

            const data = {
                user:{
                    id:user.id
                }
            }

            const token = jwt.sign(data , 'secret_ecom');
            res.json({success:true , token})
        } else {
            res.json({success:false , error:"Wrong password"});
        }
    } else {
        res.json({success:false, error:"Wrong Email id"});
    }
})
        
//Creating endpoint for newCollection
app.get("/newcollections", async (req , res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-4);
    console.log(('NewCollection Fetched'));
    res.send(newcollection);
})

//Creating endpoint for popular products

app.get('/popularinfilefolder' , async (req , res) => {
    let products = await Product.find({category: 'File-Folder'});
    let popularinFile_Folder = products.slice(0 , 4);
    console.log("Popular Products in File-Folder Fetched");
    res.send(popularinFile_Folder);
})

//Creating middleware to fetch user
const fetchUser = async (req , res , next) => {
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"});
    } else {
        try{
            const data = jwt.verify(token, "secret_ecom");
            req.user = data.user;
            next();
        } catch(error) {
            res.status(401).send({errors:"Please authenticate using a valid token"});
        }
    }
}

// Add a new schema for reviews
const Review = mongoose.model("Review", {
    productId: { type: mongoose.Schema.Types.ObjectId },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    rating: { type: Number, required: true },
    reviewText: { type: String, required: true },
    date: { type: Date, default: Date.now }
  });
  
  // Create an endpoint to add a review
  // Add the fetchUser middleware to /addreview endpoint
// Add the fetchUser middleware to /product/:id/addreview endpoint
app.post("/product/:id/addreview", fetchUser, async (req, res) => {
    const { rating, reviewText , date } = req.body;
    const userId = req.user.id;
    const productId = req.params.id;

    console.log({rating, reviewText, userId,productId , date})

    if (!userId) {
        return res.status(401).json({ success: false, error: "Please authenticate using a valid token" });
    }

    const review = new Review({
        productId: productId,
        userId: userId,
        rating: rating,
        reviewText: reviewText,
        date: date
    });

    try {
        await review.save();
        res.json({ success: true, review });
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});


  
  // Create an endpoint to get reviews for a product
  app.get("/reviews/:productId", async (req, res) => {
    const productId = req.params.productId;
  
    try {
      const reviews = await Review.find({ productId }).populate("userId", "name");
      res.json({ success: true, reviews });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

//Creating endpoint for adding products in cartdata

app.post('/addtocart' , fetchUser ,  async (req, res) => {
    console.log("Added" , req.body.itemId);
    let userData = await Users.findOne({
        _id: req.user.id
    })

    userData.cartData[req.body.itemId] += 1 ;
    await Users.findOneAndUpdate({_id:req.user.id} , {cartData:userData.cartData});
    res.send("Added")
})

//Creating endpoint to remove the product from cart

app.post('/removefromcart' , fetchUser , async (req, res) => {
    console.log("removed" , req.body.itemId);
    let userData = await Users.findOne({
        _id: req.user.id
    })

    if(userData.cartData[req.body.itemId]>0)

    userData.cartData[req.body.itemId] -= 1 ;
    await Users.findOneAndUpdate({_id:req.user.id} , {cartData:userData.cartData});
    res.send("Removed")
})

//creating endpoint to get CartData

app.post("/getcart" , fetchUser , async (req , res) => {
    let userData = await Users.findOne({
        _id: req.user.id
    })
    res.json(userData.cartData);
})

//Creating endpoint for related products

// Creating endpoint for related products based on category
app.get('/relatedproducts/:category', async (req, res) => {
    const category = req.params.category;
  
    try {
      const relatedProducts = await Product.find({ category: category }).limit(4);
      res.json({ success: true, relatedProducts: relatedProducts });
    } catch (error) {
      console.error('Error fetching related products:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  



app.listen(port , (err) => {
    if(!err){
        console.log("Server Running on port " + port);
    } else {
        console.log("Error : " + err);
    }
});




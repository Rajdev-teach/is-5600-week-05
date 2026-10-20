# Lab 05 | Fullstack Prints Part 2

## Table of Contents

1. [Lab 05 | Fullstack Prints Part 2](#lab-05--fullstack-prints-part-2)
   - [Overview](#overview)
   - [Instructions](#instructions)
2. [Guidance and Testing](#guidance-and-testing)
3. [Submission](#submission)
4. [Getting Started with GitHub and Codespaces](#getting-started-with-github-and-codespaces)
   - [Step 1: Fork the Repository](#step-1-fork-the-repository)
   - [Step 2: Open the Repository in Codespaces](#step-2-open-the-repository-in-codespaces)
   - [Step 3: Complete the Lab Assignment](#step-3-complete-the-lab-assignment)
   - [Step 4: Submit Your Work via Pull Request](#step-4-submit-your-work-via-pull-request)


## Overview

During this lab, we will be introduced to Mongodb and connect our products service to a database. We will also be introduced to the Mongoose library, which is a library that allows us to interact with our MongoDB database. The goal of the lab is to add database persistence to our products service and work with Postman to test our API endpoints.

## Instructions

1. For this lab, we begin where we left off on the previous lab, and add database persistence to our products service. Luckily, we already have a pretty module application. Open the lab in Codespaces and review the following files:

- `app.js`: This is the main application file. It is responsible for setting up the express application and starting the server.
- `api.js`: This file contains the routes for the products service. It is responsible for handling requests to our endpoints.
- `products.js`: This file contains the products service. It is responsible for handling the business logic for our products service.

2. Let's begin by modifying the `Products.create()` route handler. Open up the `api.js` file and modify your `createProduct` route handler to look like the following:

```js
/**
 * Create a new product
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
async function createProduct (req, res, next) {
  const product = await Products.create(req.body)
  res.json(product)
}
```

Now, this won't work of course, because the `Products.create()` method doesn't exist. Before we implement it though, we should create a new module to handle our database. This will allow us to separate our database logic from our application logic. Create a new file called `db.js` and add the following code:

```js
// db.js
const mongoose = require('mongoose')

/**
 * In this example we are connecting to a local MongoDB instance. This instance is running via docker-compose in our GitHub Codespaces environment.
 * In a real-world application, you would want to use a cloud-based MongoDB service like MongoDB Atlas.
 */
mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/?authSource=admin',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
)

module.exports = mongoose
```

You should already have a MongoDB instance running in a docker container here in Codespaces, so you don't need to worry about creating one.

3. Now, let's begin work on our products model. Open up the `products.js` file, and add the following code:

```js
// products.js
const cuid = require('cuid')

const db = require('./db')

// Define our Product Model
const Product = db.model('Product', {
  _id: { type: String, default: cuid },
  description: { type: String },
  alt_description: { type: String },
  likes: { type: Number, required: true },
  urls: {
    regular: { type: String, required: true },
    small: { type: String, required: true },
    thumb: { type: String, required: true },
  },
  links: {
    self: { type: String, required: true },
    html: { type: String, required: true },
  },
  user: {
    id: { type: String, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String },
    portfolio_url: { type: String },
    username: { type: String, required: true },
  },
  tags: [{
    title: { type: String, required: true },
  }], 
})
```

This command tells `mongoose` which collection in MongoDB to user, and it controls what kinds of properties the documents in teh collection should have. By default, `mongoose` will prevent use from persisting any properties absent from the schema object. This is a good thing, because it prevents us from accidentally saving data that we don't want to save.

So with our mongoose model defined, we can now implement the `Products.create()` method. Open up the `products.js` file and add the following code:

```js
// products.js
/**
 * Create a new product
 * @param {Object} product
 * @returns {Promise<Object>}
 */
async function create (fields) {
  const product = await new Product(fields).save()
  return product
}
```

What we are doing here is creating the product in memory first using the `new Product(fields)`. Then we are calling the async method `save()` which will persist the product to the database. The `save()` method returns a promise, so we can use the `await` keyword to wait for the promise to resolve. Once the promise resolves, we can return the product.
Finally, update the module exports to include the `create()` method.

Now we can test out the create products endpoint in Postman. Open post man make a `POST` request to the `/products` endpoint. You can find two example objects in the `data/product1.json` and `data/product2.json` files. Use these with Postman and create a `POST` request to verify that your API endpoint works correctly. If working correctly, you should see a response with the product that you created. If you open up the Mongo DB Atlas dashboard, you should see the product that you created in the database. This can be found under Database > Browse Collections > products.

4. Now that we have the `create()` method working, let's refactor our `list()` method in the products service module to retrieve our data from the database. Open up the `products.js` file and update the `list()` method to look like the following:

```js
// products.js
/**
 * List products
 * @param {Object} query
 * @returns {Promise<Object[]>}
 */
async function list (options = {}) {
  const { offset = 0, limit = 25, tag } = options

  // Use a ternary statement to create the query object. Then pass 
  // the query object to Mongoose to filter the products
  const query = tag ? {
    tags: {
      $elemMatch: {
        title: tag
      }
    }
  } : {}
  const products = await Product.find(query)
    .sort({ _id: 1 })
    .skip(offset)
    .limit(limit)
    
  return products
}
```

In the above snippet, the `list` method is extracting the `tag` query parameter, which is used to filter the products. The function then uses the `.find()` method to query the products collection and returns all the products that have a `tag` object with a `title` property that matches the tag parameter passed to the function.

_Note_ We use `sort({ _id: 1 })` to sort the products by their `_id` property. This is a good practice because it will ensure that the products are returned in the same order every time. Each of our products using a `cuid` as its `_id`, and if we use this to sort, we'll return our products in the order of their creation.

While we are here, let's refactor that `get()` method as well:

```js
// products.js

/**
 * Get a product
 * @param {String} _id
 * @returns {Promise<Object>}
 */
async function get (_id) {
  const product = await Product.findById(_id)
  return product
}
```

If you haven't already, checkout the webview - you should see the products that you created in the database.

5. Next, we need to implement edit and delete functionality. This will be fairly straight forward. Let's begin with the `api.js` file. Open up the `api.js` file and add the following code:

```js
// api.js

/**
 * Update a product
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
async function editProduct (req, res, next) {
  const change = req.body
  const product = await Products.edit(req.params.id, change)
  res.json(product)
}

/**
 * Delete a product
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
async function deleteProduct (req, res, next) {
  const response = await Products.destroy(req.params.id)
  res.json(response)
}
```

And create the corresponding methods in the `products.js` module. Add the following code to the `products.js` file:

```js
// products.js

/**
 * Edit a product
 * @param {String} _id
 * @param {Object} change
 * @returns {Promise<Object>}
 */
async function edit (_id, change) {
  const product = await get(_id)

  // todo can we use spread operators here?
  Object.keys(change).forEach(function (key) {
    product[key] = change[key]
  })
  
  await product.save()

  return product
}

/**
 * Delete a product
 * @param {String} _id
 * @returns {Promise<Object>}
 */
async function destroy (_id) {
  return await Product.deleteOne({_id})
}
```

Great! Now export these functions and you can now rebuild the lab, and test out your edit and delete endpoints. Using postman you should be able to submit a DELETE request or a PUT request with modified data.

7. Now that we have the products module working, let's go ahead and import some data to the database. We've included a script that will read the `data/products.json` file and import the data into the database. This script can be found in the `script/import-products.js` file. To run the script, open up the Codespaces terminal and stop the currently running server. You can do this by pressing `Ctrl + C` in the terminal to stop the server and then run the following command to import the products:

```bash
node script/import-products.js
```

Once the script is complete, you'll need to restart the server. Simply execute the following command in the terminal to start the server again. Once the server is running, you should be able to see the products in the webview.

```bash
npm start
```

8. To finalize our app's backend, we need to be able to handle more than just products. If this is to be an eCommerce app, we need to be able to take orders for products as well. For the next few steps, we will create an `orders` module, and add similar endpoints as we did above. We will also ensure that there is a relationship between
the orders and the products. When our customers create an order, we want to make sure that the order tracks the products a user has purchased.

So let's begin by registering the `orders` routes with the express server. Open up the `app.js` file and add the following code:

```js
// app.js

// ...

app.get('/orders', api.listOrders)
app.get('/orders/', api.createOrder)
```

Then open up the `api.js` file and register the following route handlers.

```js
// api.js

/**
 * Create an order
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
async function createOrder (req, res, next) {
  const order = await Orders.create(req.body)
  res.json(orders)
}

/**
 * List orders
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
async function listOrders (req, res, next) {
  const { offset = 0, limit = 25, productId, status } = req.query

  const orders = await Orders.list({ 
    offset: Number(offset), 
    limit: Number(limit),
    productId, 
    status 
  })

  res.json(orders)
}
```

Don't forget to export these functions from the `api.js` file.

9. Now, the next step is to create our Orders module. Create a new file called `orders.js`. Add the following snippets to the file:

```js
// orders.js
const cuid = require('cuid')

const db = require('./db')

const Order = db.model('Order', {
  _id: { type: String, default: cuid },
  buyerEmail: { type: String, required: true },
  products: [{
    type: String,
    ref: 'Product', // ref will automatically fetch associated products for us
    index: true,
    required: true
  }],
  status: {
    type: String,
    index: true,
    default: 'CREATED',
    enum: ['CREATED', 'PENDING', 'COMPLETED']
  }
})

/**
 * List orders
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function list(options = {}) {

  const { offset = 0, limit = 25, productId, status } = options;

  const productQuery = productId ? {
    products: productId
  } : {}

  const statusQuery = status ? {
    status: status
  } : {}

  const query = {
    ...productQuery,
    ...statusQuery
  }

  const orders = await Order.find(query)
    .sort({ _id: 1 })
    .skip(offset)
    .limit(limit)

  return orders
}

/**
 * Get an order
 * @param {Object} order
 * @returns {Promise<Object>}
 */
async function get (_id) {
  // using populate will automatically fetch the associated products.
  // if you don't use populate, you will only get the product ids
  const order = await Order.findById(_id)
    .populate('products')
    .exec()
  
  return order
}

/**
 * Create an order
 * @param {Object} order
 * @returns {Promise<Object>}
 */
async function create (fields) {
  const order = await new Order(fields).save()
  await order.populate('products')
  return order
}

```

10. Excellent - now we have an orders module, which will allow us to create new orders and list orders. Now, we will need to more CRUD functionality to the `orders` module, for instance updating and deleting. This will be your task to be completed independently.

## Your Task

1. We need to be able to update an existing order. Create a new method in the `orders.js` module called `edit()`. This method should take an `_id` and a `change` object. The method should update the order with the given `_id` with the new values in the `change` object. The method should return the updated order. You can use the `edit()` method in the `products.js` module as a reference.
2. We need to be able to delete an existing order. Create a new method in the `orders.js` module called `destroy()`. This method should take an `_id` and delete the order with the given `_id`. The method should not return a value. Again, you can use the `destroy()` method in the `products.js` module as a reference.
3. For both of these new endpoints, we need to register them with the express server. Make sure they are registered in the `app.js` file similarly to how the `products` endpoints are registered.

## Guidance and Testing

1. This lab will require Postman to test endpoints. You can download Postman [here](https://www.postman.com/downloads/). Refer to the previous labs for guidance on how to use Postman.

## Submission

Once you have completed the lab, please submit your lab by committing the code and creating a pull request against the `main` branch of your forked repository.

Once you have a URL for your Pull Request, submit that URL with a brief message in Canvas against the Assignment.

# Getting Started with GitHub and Codespaces

Welcome to the course! In this guide, you’ll learn how to set up your coding environment using GitHub and Codespaces. By following these steps, you’ll be able to work on your lab assignments, write and test your code, and submit your work for review. Let's get started!

## Step 1: Fork the Repository

Forking a repository means making a copy of it under your GitHub account. This allows you to make changes without affecting the original project.

1. **Open the Repository**: Start by navigating to the GitHub repository link provided by your instructor.
2. **Click "Fork"**: In the top-right corner, find the “Fork” button and click it.
3. **Select Your Account**: Choose your GitHub account as the destination for the fork. Once done, you’ll be redirected to your forked copy of the repository.

   > **Tip**: Make sure you’re logged into your GitHub account, or you won’t see the option to fork!

## Step 2: Open the Repository in Codespaces

With your forked repository ready, you can now set up a development environment using Codespaces. This setup provides a pre-configured environment for you to code in, with everything you need to complete the lab.

1. **Open the Codespaces Menu**:
   - In your forked repository, click the green "Code" button, then switch to the "Codespaces" tab.
2. **Create a Codespace**:
   - Click on "Create codespace on main" to start the setup.
3. **Wait for Codespaces to Load**:
   - It may take a few minutes for Codespaces to create and configure your environment. Be patient, as it’s setting up all the tools you’ll need.
4. **Start Coding**:
   - Once the setup is complete, Codespaces will automatically open a new browser tab where your code will be ready to run. You’ll be able to see the code and any outputs as you go through the lab assignment.

## Step 3: Complete the Lab Assignment

Inside the Codespaces environment, you’ll find all the files and instructions you need. Follow the steps outlined in the README file to complete your assignment.

1. **Read the Instructions**: Carefully go through the README file to understand the tasks you need to complete.
2. **Edit the Code**: Make the necessary changes to the code files as instructed.
3. **Run and Test Your Code**: Use the terminal and editor within Codespaces to run your code and make sure everything works as expected.

   > **Hint**: If you’re stuck, try reviewing the README file again or refer to any resources provided by your instructor.

## Step 4: Submit Your Work via Pull Request

Once you’ve completed the assignment, it’s time to submit your work. You’ll do this by creating a pull request, which is a way to propose your changes to the original repository.

1. **Commit Your Changes**:
   - Save your work by committing your changes. In Codespaces, go to the Source Control panel, write a commit message, and click "Commit" to save your changes.
2. **Push to Your Fork**:
   - After committing, click "Push" to upload your changes to your forked repository on GitHub.
3. **Create a Pull Request**:
   - Go back to your GitHub repository, and you’ll see an option to “Compare & pull request.” Click it to start your pull request.
   - Include your name in the pull request description so your instructor knows who submitted it.
4. **Submit the Pull Request**:
   - Click "Create pull request" to submit your work for review. Your instructor will be notified and can review your work.

And that’s it! You’ve now completed your first lab assignment using GitHub and Codespaces. Well done!

### Additional Steps

1. Open the terminal in Codespaces.
2. Run the following commands to install dependencies and start the development server:

    ```sh
    npm install
    npm run dev
    ```

3. You can now view the project in the browser by clicking the "Application" port in the Ports panel.

Follow the instructions in the previous sections to complete the lab.


## API regression checks

Run `npm ci`, set `MONGODB_URI` to an isolated MongoDB test database, then run `npm test`. The test creates and removes its own product and order and verifies the CRUD endpoints. GitHub Actions starts a disposable MongoDB 7 service for this check.

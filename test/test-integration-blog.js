'use strict'

const chai = require('chai')
const chaiHttp = require('chai-http')
const faker = require('faker')
const mongoose = require('mongoose')

const expect = chai.expect

const { BlogPost } = require('../models')
const { app, runServer, closeServer } = require('../server')
const { TEST_DATABASE_URL } = require('../config')

chai.use(chaiHttp)

function seedBlogData() {
  const seedData = []

  for (let i = 1; i <= 10; i++) {
    seedData.push(generateBlogPost())
  }

  return BlogPost.insertMany(seedData)
}

function generateTitleName() {
  const titles = [
    'My firts post',
    '3 things to be cool',
    'YouTube is no bueno',
    'Memes for kids',
    'idkmybffjill'
  ]
  return titles[Math.floor(Math.random() * titles.length)]
}

function generateAuthorName() {
  return {
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName()
  }
}

let content =
  'Lorem ipsum dolor sit amet, natum mollis mediocritatem eam cu. Utamur tacimates cu mei, at posse luptatum usu, cu ludus ancillae postulant qui. Duo accumsan atomorum comprehensam in? Id qui illum malis appareat, pro nulla mentitum molestiae an.'

function generateBlogPost() {
  return {
    author: generateAuthorName(),
    title: generateTitleName(),
    content: content
  }
}

function tearDownDb() {
  console.warn('Deleting database')
  return mongoose.connection.dropDatabase()
}

describe('Blog API', function() {
  before(function() {
    return runServer(TEST_DATABASE_URL)
  })

  beforeEach(function() {
    return seedBlogData()
  })

  afterEach(function() {
    return tearDownDb()
  })

  after(function() {
    return closeServer()
  })

  describe('GET endpoint', function() {
    it('should return all blog posts', function() {
      let res
      return chai
        .request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res
          expect(res).to.have.status(200)
          // console.log(res.body.posts)
          expect(res.body.posts).to.have.length.of.at.least(1)

          return BlogPost.count()
        })
        .then(function(count) {
          expect(res.body.posts).to.have.length.of.at.least(count)
        })
    })

    it('should return blog posts with the right fields', function() {
      let resBlogPost
      return chai
        .request(app)
        .get('/posts')
        .then(function(res) {
          expect(res).to.have.status(200)
          expect(res).to.be.json
          expect(res.body.posts).to.be.a('array')
          expect(res.body.posts).to.have.length.of.at.least(1)

          res.body.posts.forEach(function(post) {
            expect(post).to.be.a('object')
            expect(post).to.be.include.keys('id', 'title', 'content', 'author')
          })

          resBlogPost = res.body.posts[0]
          return BlogPost.findById(resBlogPost.id)
        })
        .then(function(post) {
          expect(resBlogPost.id).to.equal(post.id)
          expect(resBlogPost.title).to.equal(post.title)
          expect(resBlogPost.content).to.equal(post.content)
          expect(resBlogPost.author).to.equal(
            post.author.firstName + ' ' + post.author.lastName
          )
        })
    })
  })

  describe('POST endpoint', function() {
    it('should add a new post', function() {
      const newPost = generateBlogPost()

      return chai
        .request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          expect(res).to.have.status(201)
          expect(res).to.be.json
          expect(res.body).to.be.a('object')
          expect(res.body).to.include.keys('id', 'title', 'content', 'author')
          expect(res.body.title).to.equal(newPost.title)
          expect(res.body.id).to.not.be.null
          expect(res.body.author).to.equal(
            `${newPost.author.firstName} ${newPost.author.lastName}`
          )
          expect(res.body.content).to.equal(newPost.content)
        })
    })
  })

  describe('PUT endpoint', function() {
    it('should update an existing post', function() {
      let updateData = {
        title: 'No more Christmases'
      }

      return BlogPost.findOne()
        .then(function(post) {
          updateData.id = post.id

          return chai
            .request(app)
            .put(`/posts/${post.id}`)
            .send(updateData)
        })
        .then(function(res) {
          expect(res).to.have.status(204)
          return BlogPost.findById(updateData.id)
        })
        .then(function(post) {
          expect(post.title).to.equal(updateData.title)
        })
    })
  })

  describe('DELETE endpoint', function() {
    it('deletes a blogpost by id', function() {
      let post

      return BlogPost.findOne()
        .then(function(_post) {
          post = _post
          return chai.request(app).delete(`/posts/${post.id}`)
        })
        .then(function(res) {
          expect(res).to.have.status(204)
          return BlogPost.findById(post.id)
        })
        .then(function(_post) {
          expect(_post).to.be.null
        })
    })
  })
})

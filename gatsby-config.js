/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.org/docs/gatsby-config/
 */

module.exports = {
  /* Your site config here */
  plugins: [],
  proxy:[
    {
      prefix: "/api",
      //url:"http://ec2-3-85-224-40.compute-1.amazonaws.com:8001"
      url:"http://127.0.0.1:8001"
    },
    {
      prefix: "/uploads",
      //url:"http://ec2-3-85-224-40.compute-1.amazonaws.com:8001"
      url:"http://127.0.0.1:8001"
    },
  ],
}

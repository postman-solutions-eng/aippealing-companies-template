/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Get company
* Get company and its a(i)ppealing associations
*
* companyId String Company ID
* material String Material to use for the product (optional)
* mode String Mode to use for the product search (exact, fuzzy, ai) (optional)
* 
* returns Company
* */
const getCompany = ({ companyId, material, mode, xApiKey }) => new Promise(
  async (resolve, reject) => {
    try {
      
      if (!xApiKey || !xApiKey.startsWith("sk-")) {
        // throw error with status code 401 and message "Unauthorized"
        return reject(Service.rejectResponse(
          { "message": "Unauthorized" },
          401,
        ));
      }
      
      // get environment variable token
      //var token = process.env.token;

      // set token to the value of the X-Api-Key header
      //var token = xApiKey.replace("Bearer ", "");

      var token = xApiKey;

      // get environment variable size, if not set, set it to 256x256
      var size = process.env.size || "256x256";

      var company = companyId;

      // read in curated mock data from file data/companies.json
      var fs = require('fs');
      var companies = JSON.parse(fs.readFileSync('data/companies.json', 'utf8'));

      // set filtered to an empty array
      var filtered = [];

      var request = require('request-promise');

      // if mode is fuzzy, iterate through the curated items and filter all the items where company name is fuzzy matched the company variable or the variable is part of the company description
      if (mode == "fuzzy") {
        filtered = companies.filter(function (item) {
          return item.name.toLowerCase().includes(company.toLowerCase()) || item.description.toLowerCase().includes(company.toLowerCase());
        });
      } else if (mode == "exact") {
        // if mode is direct, iterate through akk curated items and only return an item if its id is equal to the company variable
        filtered = companies.filter(function (item) {
          return item.id == company;
        });
      } else if (mode == "ai") {
        // create a new company object by derriving the company description, motto, city and its product from the company variable and OpenAI's Davinci API
        var prompt = `Company ${company} is mostly known for its `;
        var productName = "unknown product";
        var options = {
          'method': 'POST',
          'url': 'https://api.openai.com/v1/completions',
          'headers': {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            "model": "text-davinci-003",
            "prompt": prompt,
            "temperature": 0.2,
            "max_tokens": 10,
            "frequency_penalty": -2
          })

        };

        // send request to openai and wait for response, save response to url
        await request(options, function (error, response) {
          if (error) {
            console.log(error);
          } else {
            // test whether the response is valid json and contains choices array
            var choices = JSON.parse(response.body).choices;
            if (choices) {
              var firstItem = choices[0];
              console.log(firstItem.text);

              // only take text until the first end of the sentence and remove any new lines and quotes
              productName = company + " " + firstItem.text.split(".")[0].replace(/(\r\n|\n|\r)/gm, "").replace(/"/g, "").trim();
            } else {
              console.log("OpenAI did not return a valid response: " + response.body);
              // return a success response with a 200 status code and an object with message "OpenAI did not return a valid response"
              // override the default status code 500 with 200
              response.statusCode = 200;
              response.body = { "message": "OpenAI did not return a valid response", "status": 200 };
            }
          }
        });

        filtered= [{
          "id": "company-ai",
          "name": company,
          "description": "A company that is mostly known for " + productName,
          "motto": "A motto",
          "city": "A city",
          "associations": [
            {
              "name": productName,
              "material": material || "lego",
              "url": "will be replaced"
            }
          ]
        }];
      } else {
        // throw an exception if mode is not fuzzy, direct or ai
        throw new Error("Invalid mode");
      }

      // if the filtered array is empty, return a 404 and an object with message "Company not found"
      if (filtered.length == 0) {
        // throw error with status code 404 and message "Company not found"
        return reject(Service.rejectResponse(
          { "message": "Company not found" },
          404,
        ));
      }

      var companyRecord = filtered.pop();

      // go through each item of the associations array and replace the url with a generated image url
      for (var i = 0; i < companyRecord.associations.length; i++) {
        var association = companyRecord.associations[i];
        association.material = material || association.material;
        var prompt = companyRecord.name + " " + association.name + " made of " + association.material;
        console.log("prompt: " + prompt);
        var options = {
          'method': 'POST',
          'url': 'https://api.openai.com/v1/images/generations',
          'headers': {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            "prompt": prompt,
            "n": 1,
            "size": size
          })

        };

        // send request to openai and wait for response, save response to url
        await request(options, function (error, response) {
          association.url = "https://user-images.githubusercontent.com/1872314/210279871-0ddf7100-a680-4e9a-9a28-2fcfbcf30355.png";
          if (error) {
            console.log(error);
          } else {
            var data = JSON.parse(response.body).data;
            if (data) {
              var url = data[0].url;
              association.url = url;
            } else {
              console.log("OpenAI did not return a valid response: " + response.body);
              // return a success response with a 200 status code and an object with message "OpenAI did not return a valid response"
              // override the default status code 500 with 200
              response.statusCode = 200;
              response.body = { "message": "OpenAI did not return a valid response", "status": 200 };
            }
          }
        });
      }

      resolve(Service.successResponse(companyRecord));
    } catch (e) {
      reject(Service.rejectResponse(
        { "message": e.message || 'Invalid input', "status": e.status || 500},
        e.status || 500,
      ));
    }
  },
);
/**
* List all companies
* List all companies and their a(i)ppealing associations
*
* returns List
* */
const listCompanies = () => new Promise(
  async (resolve, reject) => {
    try {
      // read in curated mock data from file data/companies.json
      var fs = require('fs');
      var curatedMockData = JSON.parse(fs.readFileSync('data/companies.json', 'utf8'));

      resolve(Service.successResponse(curatedMockData));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  getCompany,
  listCompanies,
};

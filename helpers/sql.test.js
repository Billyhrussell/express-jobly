const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate, sqlForFiltering } = require("./sql");



describe("sqlForPartialUpdate", function(){
  test("recieve correct data obj", function(){
    const data = {firstName: 'Aliya', age: 32};
    const jsToSql = {firstName: "first_name"};

    expect(sqlForPartialUpdate(data, jsToSql)).toEqual(
      {setCols: "\"first_name\"=$1, \"age\"=$2",
       values: ['Aliya', 32]
      }
    )
  })

  test("recieve empty data object", function(){
    const data = {};
    const jsToSql = {firstName: "first_name"};

    try {
      sqlForPartialUpdate(data, jsToSql);
    } catch(err) {
      expect(err instanceof BadRequestError).toBeTruthy;
    }
  })
});

describe("sqlForFiltering", function(){
  test("recieve correct data obj", function(){
    const data = {name: 'hi', minEmployees: 20, maxEmployees: 50};

    expect(sqlForFiltering(data)).toEqual(
      {setCols: 'name ILIKE $1 AND num_employees >=$2 AND num_employees <=$3',
       values: ['%hi%', 20, 50]
      }
    )
  })

  test("recieve empty data object", function(){
    const data = {};

    try {
      sqlForFiltering(data);
    } catch(err) {
      expect(err instanceof BadRequestError).toBeTruthy;
    }
  })
});
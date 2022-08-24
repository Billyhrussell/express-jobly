const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");



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

  // test("recieve empty data object", function(){
  //   const data = {};
  //   const jsToSql = {firstName: "first_name"};

  //   const resp = sqlForPartialUpdate(data, jsToSql);
  //   expect(resp.statusCode).toEqual(400);
  // })
});
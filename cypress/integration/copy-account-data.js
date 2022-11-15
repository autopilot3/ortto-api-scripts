describe('Duplicating data from one account to another', () => {

    it('Copy tags', () => {
        // get all tags from the source account
        cy.request({
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': Cypress.env("source_account_api_key")
            },
            method: 'POST',
            url: `https://api.ap3api.com/v1/tags/get`,
            body: {}
        }).then((response) => {
            assert.equal(response.status, 200)
            let tags = []
            tags = response.body.map(t => t.name)
            console.log(`Source account has ${tags.length} tags`)

            // add tags to the destination account by creating a person with those tags
            cy.request({
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': Cypress.env("destination_account_api_key")
                },
                method: 'POST',
                url: `https://api.ap3api.com/v1/person/merge`,
                body: {
                    "people": [
                        {
                            "fields": {
                                "str::first": "Ortto",
                                "str::last": "Test",
                                "str::email": "peter.b@ortto.com"
                            },
                            "tags": tags
                        }
                    ],
                    "merge_by": ["str::email"]
                }
            }).then((response2) => {
                assert.equal(response2.status, 200)
            })
        })
    })

    let fieldTypes = ["person", "organizations"]
    fieldTypes.forEach((fieldType) => {
        it(`Copy ${fieldType} custom fields`, () => {
            // get all custom fields
            cy.request({
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': Cypress.env("source_account_api_key")
                },
                method: 'POST',
                url: `https://api.ap3api.com/v1/${fieldType}/custom-field/get`
            }).then((response) => {
                assert.equal(response.status, 200)
                let fields = []
                fields = response.body.fields
                let fieldCount = fields == null ? 0 : fields.length
                console.log(`Source account has ${fieldCount} ${fieldType} fields`)

                // if there are any fields, create them in the destination account
                if (fields != null) {
                    fields.forEach(field => {
                        let fieldname = '', fieldDisplaytype = ''
                        if (fieldType == 'person') {
                            fieldname = field.field.name
                            fieldDisplaytype = field.field.display_type
                        } else {
                            fieldname = field.name
                            fieldDisplaytype = field.display_type
                        }
                        if (fieldDisplaytype == 'single_select' || fieldDisplaytype == 'multi_select') {
                            console.log(`Can't create field ${fieldname} since it's type ${fieldDisplaytype}`)
                        } else {
                            console.log(`Creating ${fieldDisplaytype} field: ${fieldname}`)
                            cy.request({
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-Api-Key': Cypress.env("destination_account_api_key")
                                },
                                method: 'POST',
                                url: `https://api.ap3api.com/v1/${fieldType}/custom-field/create`,
                                body: {
                                    "type": fieldDisplaytype,
                                    "name": fieldname
                                },
                                failOnStatusCode: false
                            }).then((response2) => {
                                if (response2.status == 423) {
                                    console.log(`field ${fieldname} (${fieldDisplaytype}) already exists`)
                                } else {
                                    assert.equal(response2.status, 200, `Error: ${response2.error}`)
                                    assert.equal(response2.body.name, fieldname, "created field name didn't match")
                                }
                            })
                        }
                    })
                }
            })
        })
    })
})
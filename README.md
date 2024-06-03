Meet the brilliant yet eccentric Dr. Emmett Brown, better known as Doc. Hopelessly stuck in 2023, he is fixing his
time machine to go back to the future and save his friend. His favourite online store FluxKart.com sells all the
parts required to build this contraption. As crazy as he might get at times, Doc surely knows how to be careful. To
avoid drawing attention to his grandiose project, Doc is using different email addresses and phone numbers for
each purchase.

FluxKart.com is deadpan serious about their customer experience. There is nothing more important than
rewarding their loyal customers a#nd giving a personalised experience. To do this, FluxKart decides to integrate
Bitespeed into their platform. Bitespeed collects contact details from shoppers for a personalised customer
experience.
However, given Doc's modus operandi, Bitespeed faces a unique challenge: linking different orders made with
different contact information to the same person.

# Approach for various cases

## post/createContact/v1/

Create contact with enum for link precedence (primary and secondary)

## post/identify/v1/

## Test cases

### CASE I - The web service should return an HTTP 200 response with a JSON payload containing the consolidated contact for

{
"email"?: string,
"phoneNumber"?: number
}

### CASE II - no existing contacts against an incoming request? Create a new contact

### CASE III - If an incoming request has either of phoneNumber or email common to an existing contact but contains new information, the service will create a “secondary” Contact row.

### CASE IV - Primary contacts turn into secondary

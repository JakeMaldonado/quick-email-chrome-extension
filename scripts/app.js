'use strict';

//API RQUEST FUNCTIONS

let httpPostAsync = (url, email, callback) => {
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = () => {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
          callback(xmlHttp.responseText);
  }
  xmlHttp.open("POST", url, true);
  xmlHttp.setRequestHeader('Content-type','application/json; charset=utf-8');
  xmlHttp.send(JSON.stringify({"email": email}));
}

// LOCAL STORAGE FUNCTIONS

// data should be a JSON object {"key": "value"}
let setLocalStorage = data => {
  chrome.storage.sync.set(data, function(){
      console.log(`${data} was stored!`);
  });
}

let getLocalStorage = key => {
  chrome.storage.sync.get(key, function(items){
      return items;
  });
}

let removeLocalStorage = key => {
  chrome.storage.sync.remove(key, function(items){
      return items;
  });
};

//// TODO: CHECK IF EMAIL HAS BEEN CONTACTED

//USER FUNCTIONS

(async () => {
  let currentUser = await getLocalStorage('user');
  if(!currentUser) {
    await setLocalStorage({'user': {}});
  }
})();

// creates a signature - replaces current one
let setUserSignature = async (signature) => {
  let currentUser = await getLocalStorage('user');
  currentUser.signature = signature;
  return await setLocalStorage(currentUser);
};

// bcc should be an array - replaces current values
let setUserBcc = async (bcc) => {
  let currentUser = await getLocalStorage('user');
  currentUser.bcc = bcc;
  return await setLocalStorage(currentUser);
};

// TEMPLATE FUNCTIONS
// - currently only storing 1 template
let saveNewTemplate = async (body=null, subject=null, cc=null, bcc=null) => {
  try {
    let removedTemplate = await removeLocalStorage("template");
    console.log(`${removedTemplate} was removed from local storage.`);
    let newTemplate = {
      "subject": subject,
      "body": body,
      "bcc": bcc,
      "cc": cc
    };
    setLocalStorage({"template": newTemplate});
    console.log(`${newTemplate} was saved.`);
    return 'success';
  } catch (e) {
    console.log(e);
    return 'failure';
  }
};

let getCurrentTemplate = async () => {
  return await getLocalStorage("template");
};

// templates will have values inserted into - {{property}}
let formatTemplate = async contact => {
  let formatValues = ['{{firstname}}', '{{lastname}}', '{{company}}']
  let template = getCurrentTemplate();
  let foundValues = {
    'firstname': contact.firstname,
    'lastname': contact.lastname,
    'company': contact.company
  };
  console.log(foundValues);
  template = template.replace(/{{firstname}}/g, foundValues.firstname);
  template = template.replace(/{{lastname}}/g, foundValues.lastname);
  template = template.replace(/{{company}}/g, foundValues.company);
  return template;
};

// CONTACT FUNCTIONS
let getCurrentContacts = async () => {
  return await getLocalStorage('currentContacts');
};

let contacts = getCurrentContacts();

// contact should be JSON: {firstname, lastname, email, company}
// contact will be added to contacts object with email as they key
let addContact = async contact => {
  try {
    let currentContacts = await getCurrentContacts();
    let contactEmail = contact.email;
    currentContacts.contacts.contactEmail = {
      "firstname": contact.firstname,
      "lastname": contact.lastname,
      "company": contact.company
    };
    let setStatus = await setLocalStorage(currentContacts);
    return setStatus;
  } catch (e) {
    console.log(e);
    return 'failure';
  }
};

// contacts should be JSON object of contacts same as addContact function [{contacts}]
let addContacts = async toAdd => {
  try {
    let currentContacts = await  getCurrentContacts();
    while (toAdd) {
      let contact = toAdd.pop();
      let contactEmail = contact.email;
      currentContacts.contacts.contactEmail = {
        "firstname": contact.firstname,
        "lastname": contact.lastname,
        "company": contact.company
      }
    }
    let setStatus = await setLocalStorage(currentContacts);
    return setStatus;
  } catch (e) {
    console.log(e);
    return 'failure';
  }
};

// MAIN

const el = document.createElement('div');
el.innerHTML = 'hello there';

InboxSDK.load(1, 'sdk_torchemailtest_a2857a83aa').then((sdk) => {
  sdk.Toolbars.addToolbarButtonForApp({
    title: "",
    iconUrl: 'https://cdn.launchaco.com/images/4766a6b0-d869-45dc-91fa-942405a0acd2.png',
    arrowColor: '#ff6666',
    onClick: (event) => {
      console.log(event.dropdown);
      event.dropdown.el = el;
    }
  });
  sdk.Compose.registerComposeViewHandler((composeView) => {
    composeView.addButton({
      title: "Torch Quick Email",
      iconUrl: 'http://files.softicons.com/download/social-media-icons/new-social-media-icons-by-mohamed-elgharabawy/png/256x256/email.png',
      hasDropdown: true,
      onClick: (event) => {
        let email = contacts.contacts.pop()
        event.composeView.setToRecipients([email]);
        event.composeView.setSubject(templateSubject);
        event.composeView.setBodyHTML(templateBody);
        event.composeView.setBccRecipients(templateBCC); //ONLY USE IF HUBSPOT TRACKING IS OFF
      }
    });
    composeView.addButton({
      title: "Send and Next",
      iconUrl: 'https://orig00.deviantart.net/2f44/f/2017/304/9/6/telegram_icon_by_mrkarianov-dbs9z16.png',
      onClick: async (event) => {
        composeView.send();
        event.composeView.presending(
          sdk.Compose.openNewComposeView()
        );
      }
    });

    composeView.on('destroy', (event) => {
      console.log('compose view going away, time to clean up');
    });
  });
});

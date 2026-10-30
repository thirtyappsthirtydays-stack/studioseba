/* Studio Seba contact form. Sends through Web3Forms (https://web3forms.com)
   when an access key is set in the form; until then it opens the visitor's
   email app with their answers filled in. */
(function () {
  'use strict';
  var TO = 'bengisuhalezeroglu@gmail.com';
  var f = document.getElementById('sb-contact');
  if (!f) return;
  var status = document.getElementById('sb-form-status');
  var btn = f.querySelector('button[type="submit"]');

  function say(msg) { if (status) status.textContent = msg; }

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (f.botcheck && f.botcheck.checked) return; // spam bots tick hidden boxes
    var d = new FormData(f);
    var name = String(d.get('name') || '').trim();
    var email = String(d.get('email') || '').trim();
    var company = String(d.get('company') || '').trim();
    var message = String(d.get('message') || '').trim();
    var topics = d.getAll('topics').join(', ');
    if (!name || !email) {
      say('Please add your name and email so I can reply.');
      (name ? f.email : f.name).focus();
      return;
    }
    var key = String(d.get('access_key') || '');
    var subject = 'New enquiry from ' + name + (company ? ' (' + company + ')' : '') + ' via studioseba.com';

    if (!key || key.indexOf('YOUR_') === 0) {
      var body = 'Name: ' + name + '\nCompany: ' + (company || '-') + '\nInterested in: ' + (topics || '-') +
                 '\nEmail: ' + email + (message ? '\n\n' + message : '');
      say('Opening your email app…');
      window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      return;
    }

    btn.disabled = true;
    say('Sending…');
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: key, subject: subject, from_name: 'Studio Seba website', replyto: email,
        name: name, company: company || '-', interested_in: topics || '-', email: email, message: message || '-'
      })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.success) throw new Error('not sent');
      f.reset();
      say('Thanks, ' + name.split(' ')[0] + '! Your message is on its way. I’ll get back to you soon.');
    }).catch(function () {
      say('Sorry, that didn’t send. Please email me at ' + TO + '.');
    }).then(function () { btn.disabled = false; });
  });
})();

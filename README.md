# YouTube Warden

A chrome browser extension for controlling access to YouTube by whitelisting specific 
videos, channels or playlists with optional timeouts. Intended for use by parents.

## Features

Once the extension is installed when you browse to YouTube, you will be prompted to set up a password. After this,
access to viewing videos on YouTube will be require entering the password. Access can be granted to a specific video, playlist,
channel or all videos. This access may be indefinite or for a specific amount of time.

Repeated password guessing is prevented with a timeout.

The password can be reset from the extension settings. "allow records" that grant access to specific videos, channels and playlists
can also be deleted from the extension settings.

## Limitations

In order to prevent your child from disabling this extension, you should use google chrome browser policies.
There is more than one way to do this. There are specific policies for forcing a specific extension to be 
used, however I do not use this and instead just prevent access to the settings pages that would allow 
disabling the extension.

For example, in Linux `/etc/opt/chrome/policies/50-block-list.json`
```json
{
  "URLBlockList": 
      [ "chrome://settings"
      , "chrome://extensions"
      , "chrome-extension://*"
      ]

}
```

Note that disabling these URLs cannot be done (so far as I can tell) remotely by FamilyLink. 

## Future work

- Improve the options page
- More reliable behaviour on shorts page
- options to exclude shorts when allowing videos

- Possibly rewrite with better architecture, triggered by video elements playing rather than page mutations

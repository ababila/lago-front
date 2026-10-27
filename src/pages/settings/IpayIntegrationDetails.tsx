import { gql } from '@apollo/client'
import { Icon } from 'lago-design-system'
import { useMemo } from 'react'
import { generatePath, useParams } from 'react-router'

import { Alert } from '~/components/designSystem/Alert'
import { Button } from '~/components/designSystem/Button'
import { Popper } from '~/components/designSystem/Popper'
import { Skeleton } from '~/components/designSystem/Skeleton'
import { Tooltip } from '~/components/designSystem/Tooltip'
import { Typography } from '~/components/designSystem/Typography'
import { IntegrationsPage } from '~/components/layouts/Integrations'
import { MainHeader } from '~/components/MainHeader/MainHeader'
import { useAddIpayDialog } from '~/components/settings/integrations/AddIpayDialog'
import { useDeleteIpayIntegrationDialog } from '~/components/settings/integrations/DeleteIpayIntegrationDialog'
import {
  useAddEditSuccessRedirectUrlDialog,
  useDeleteSuccessRedirectUrlDialog,
} from '~/components/settings/integrations/SuccessRedirectUrlDialogs'
import { addToast, envGlobalVar } from '~/core/apolloClient'
import { IntegrationsTabsOptionsEnum } from '~/core/constants/tabsOptions'
import { INTEGRATIONS_ROUTE, IPAY_INTEGRATION_ROUTE, useNavigate } from '~/core/router'
import { copyToClipboard } from '~/core/utils/copyToClipboard'
import {
  IpayIntegrationDetailsFragment,
  ProviderTypeEnum,
  useIpayIntegrationDetailsQuery,
} from '~/generated/graphql'
import { useInternationalization } from '~/hooks/core/useInternationalization'
import { useCurrentUser } from '~/hooks/useCurrentUser'
import { usePermissions } from '~/hooks/usePermissions'
import Ipay from '~/public/images/ipay.svg'
import { MenuPopper, PopperOpener } from '~/styles'

const PROVIDER_CONNECTION_LIMIT = 2

gql`
  fragment IpayIntegrationDetails on IpayProvider {
    id
    name
    code
    secretKey
    webhookSecret
    successRedirectUrl
  }

  query ipayIntegrationDetails($id: ID!, $limit: Int, $type: ProviderTypeEnum) {
    paymentProvider(id: $id) {
      ... on IpayProvider {
        id
        ...IpayIntegrationDetails
      }
    }

    paymentProviders(limit: $limit, type: $type) {
      collection {
        ... on IpayProvider {
          id
        }
      }
    }
  }
`

const IpayIntegrationDetails = () => {
  const navigate = useNavigate()
  const { integrationId } = useParams()
  const { hasPermissions } = usePermissions()
  const { openAddIpayDialog } = useAddIpayDialog()
  const { openDeleteIpayIntegrationDialog } = useDeleteIpayIntegrationDialog()
  const { openAddEditSuccessRedirectUrlDialog } = useAddEditSuccessRedirectUrlDialog()
  const { openDeleteSuccessRedirectUrlDialog } = useDeleteSuccessRedirectUrlDialog()
  const { apiUrl } = envGlobalVar()
  // Not `useOrganizationInfos`: its cross-tab cache can bake another org's id into the webhook URL.
  const { currentMembership } = useCurrentUser()
  const currentOrganizationId = currentMembership?.organization.id || ''
  const { translate } = useInternationalization()
  const { data, loading } = useIpayIntegrationDetailsQuery({
    variables: {
      id: integrationId as string,
      limit: PROVIDER_CONNECTION_LIMIT,
      type: ProviderTypeEnum.Ipay,
    },
    skip: !integrationId,
  })
  const ipayPaymentProvider = data?.paymentProvider as IpayIntegrationDetailsFragment

  const deleteDialogCallback = () => {
    if ((data?.paymentProviders?.collection.length || 0) >= PROVIDER_CONNECTION_LIMIT) {
      navigate(
        generatePath(IPAY_INTEGRATION_ROUTE, {
          integrationGroup: IntegrationsTabsOptionsEnum.Community,
        }),
      )
    } else {
      navigate(
        generatePath(INTEGRATIONS_ROUTE, {
          integrationGroup: IntegrationsTabsOptionsEnum.Community,
        }),
      )
    }
  }

  const canEditIntegration = hasPermissions(['organizationIntegrationsUpdate'])
  const canDeleteIntegration = hasPermissions(['organizationIntegrationsDelete'])

  const webhookUrl = useMemo(
    () => `${apiUrl}/webhooks/ipay/${currentOrganizationId}?code=${ipayPaymentProvider?.code}`,
    [apiUrl, currentOrganizationId, ipayPaymentProvider?.code],
  )

  if (!integrationId) return null

  return (
    <div>
      <MainHeader.Configure
        breadcrumb={[
          {
            label: translate('text_62b1edddbf5f461ab9712750'),
            path: generatePath(INTEGRATIONS_ROUTE, {
              integrationGroup: IntegrationsTabsOptionsEnum.Community,
            }),
          },
          {
            label: translate('text_1793114148166k69yfzefi4w'),
            path: generatePath(IPAY_INTEGRATION_ROUTE, {
              integrationGroup: IntegrationsTabsOptionsEnum.Community,
            }),
          },
        ]}
        entity={{
          viewName: ipayPaymentProvider?.name || '',
          viewNameLoading: loading,
          metadata: translate('text_1793114148167iikzjum8v5x'),
          metadataLoading: loading,
          badges: [{ type: 'default', label: translate('text_1793114148166k69yfzefi4w') }],
          icon: <Ipay />,
        }}
        actions={{
          items: [
            {
              type: 'dropdown',
              label: translate('text_626162c62f790600f850b6fe'),
              items: [
                {
                  label: translate('text_65845f35d7d69c3ab4793dac'),
                  hidden: !canEditIntegration,
                  onClick: (closePopper) => {
                    openAddIpayDialog({
                      provider: ipayPaymentProvider,
                      deleteCallback: deleteDialogCallback,
                    })
                    closePopper()
                  },
                },
                {
                  label: translate('text_65845f35d7d69c3ab4793dad'),
                  hidden: !canDeleteIntegration,
                  onClick: (closePopper) => {
                    openDeleteIpayIntegrationDialog({
                      provider: ipayPaymentProvider,
                      callback: deleteDialogCallback,
                    })
                    closePopper()
                  },
                },
              ],
            },
          ],
          loading,
        }}
      />

      <div className="mb-12 flex max-w-[672px] flex-col gap-8 px-4 py-0 md:px-12">
        <Alert type="warning">{translate('text_1733303404277q80b216p5zr')}</Alert>

        <section>
          <div className="flex h-18 w-full items-center justify-between">
            <Typography className="flex h-18 w-full items-center" variant="subhead1">
              {translate('text_664c732c264d7eed1c74fdc5')}
            </Typography>

            {canEditIntegration && (
              <Button
                variant="quaternary"
                align="left"
                onClick={() => {
                  openAddIpayDialog({
                    provider: ipayPaymentProvider,
                    deleteCallback: deleteDialogCallback,
                  })
                }}
              >
                {translate('text_62b1edddbf5f461ab9712787')}
              </Button>
            )}
          </div>
          {loading && (
            <>
              {[0, 1, 2].map((i) => (
                <IntegrationsPage.ItemSkeleton key={`item-skeleton-${i}`} />
              ))}
              <div style={{ height: 24 }} />
              <Skeleton className="mb-4 w-60" variant="text" />
            </>
          )}
          {!loading && (
            <>
              <IntegrationsPage.DetailsItem
                icon="text"
                label={translate('text_626162c62f790600f850b76a')}
                value={ipayPaymentProvider.name}
              />
              <IntegrationsPage.DetailsItem
                icon="id"
                label={translate('text_62876e85e32e0300e1803127')}
                value={ipayPaymentProvider.code}
              />
              <IntegrationsPage.DetailsItem
                icon="key"
                label={translate('text_17497252876688ai900wowoc')}
                value={ipayPaymentProvider.secretKey ?? undefined}
              />
              <IntegrationsPage.DetailsItem
                icon="key"
                label={translate('text_174987818899252mkql029wz')}
                value={ipayPaymentProvider.webhookSecret ?? undefined}
              >
                {ipayPaymentProvider.webhookSecret && (
                  <Tooltip title={translate('text_1727623127072q52kj0u3xql')} placement="top-end">
                    <Button
                      variant="quaternary"
                      onClick={() => {
                        copyToClipboard(ipayPaymentProvider.webhookSecret as string)
                        addToast({
                          severity: 'info',
                          translateKey: 'text_1727623090069kyp9o88hpqf',
                        })
                      }}
                    >
                      <Icon name="duplicate" />
                    </Button>
                  </Tooltip>
                )}
              </IntegrationsPage.DetailsItem>
              <IntegrationsPage.DetailsItem
                icon="link"
                label={translate('text_6271200984178801ba8bdf22')}
                value={webhookUrl}
              >
                <Tooltip title={translate('text_1727623127072q52kj0u3xql')} placement="top-end">
                  <Button
                    variant="quaternary"
                    onClick={() => {
                      copyToClipboard(webhookUrl as string)
                      addToast({
                        severity: 'info',
                        translateKey: 'text_1727623090069kyp9o88hpqe',
                      })
                    }}
                  >
                    <Icon name="duplicate" />
                  </Button>
                </Tooltip>
              </IntegrationsPage.DetailsItem>

              <Typography
                className="mt-3"
                variant="caption"
                html={translate('text_1793114148167vbyr9fdfa9o')}
              />
            </>
          )}
        </section>

        <section>
          <IntegrationsPage.Headline label={translate('text_65367cb78324b77fcb6af21c')}>
            {canEditIntegration && (
              <Button
                variant="quaternary"
                disabled={!!ipayPaymentProvider?.successRedirectUrl}
                onClick={() => {
                  openAddEditSuccessRedirectUrlDialog({
                    mode: 'Add',
                    type: 'Ipay',
                    provider: ipayPaymentProvider,
                  })
                }}
              >
                {translate('text_65367cb78324b77fcb6af20e')}
              </Button>
            )}
          </IntegrationsPage.Headline>

          {loading && <IntegrationsPage.ItemSkeleton />}
          {!loading && !ipayPaymentProvider?.successRedirectUrl && (
            <Typography variant="caption" color="grey600">
              {translate('text_65367cb78324b77fcb6af226', {
                connectionName: translate('text_1793114148166k69yfzefi4w'),
              })}
            </Typography>
          )}
          {!loading && ipayPaymentProvider?.successRedirectUrl && (
            <IntegrationsPage.DetailsItem
              icon="globe"
              label={translate('text_65367cb78324b77fcb6af1c6')}
              value={ipayPaymentProvider?.successRedirectUrl}
            >
              {(canEditIntegration || canDeleteIntegration) && (
                <Popper
                  className="relative h-full"
                  PopperProps={{ placement: 'bottom-end' }}
                  opener={({ isOpen }) => (
                    <PopperOpener className="-top-4 right-0 md:right-0">
                      <Tooltip
                        placement="top-end"
                        disableHoverListener={isOpen}
                        title={translate('text_629728388c4d2300e2d3810d')}
                      >
                        <Button icon="dots-horizontal" variant="quaternary" />
                      </Tooltip>
                    </PopperOpener>
                  )}
                >
                  {({ closePopper }) => (
                    <MenuPopper>
                      {canEditIntegration && (
                        <Button
                          startIcon="pen"
                          variant="quaternary"
                          fullWidth
                          align="left"
                          onClick={() => {
                            openAddEditSuccessRedirectUrlDialog({
                              mode: 'Edit',
                              type: 'Ipay',
                              provider: ipayPaymentProvider,
                            })
                            closePopper()
                          }}
                        >
                          {translate('text_65367cb78324b77fcb6af24d')}
                        </Button>
                      )}

                      {canDeleteIntegration && (
                        <Button
                          startIcon="trash"
                          variant="quaternary"
                          align="left"
                          fullWidth
                          onClick={() => {
                            openDeleteSuccessRedirectUrlDialog({
                              type: 'Ipay',
                              provider: ipayPaymentProvider,
                            })
                            closePopper()
                          }}
                        >
                          {translate('text_65367cb78324b77fcb6af243')}
                        </Button>
                      )}
                    </MenuPopper>
                  )}
                </Popper>
              )}
            </IntegrationsPage.DetailsItem>
          )}
        </section>
      </div>
    </div>
  )
}

export default IpayIntegrationDetails
